
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.award_coins(_amount INTEGER, _source TEXT, _reference TEXT DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); new_balance INTEGER;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount <= 0 OR _amount > 10000 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  INSERT INTO public.wallets (user_id, coins) VALUES (uid, _amount)
    ON CONFLICT (user_id) DO UPDATE SET coins = wallets.coins + _amount, updated_at = now()
    RETURNING coins INTO new_balance;
  INSERT INTO public.coin_transactions (user_id, amount, source, reference)
    VALUES (uid, _amount, _source, _reference);
  RETURN new_balance;
END; $$;
REVOKE ALL ON FUNCTION public.award_coins(INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_coins(INTEGER, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.purchase_item(_item_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); item RECORD; bal INTEGER; is_prem BOOLEAN;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO item FROM public.shop_items WHERE code = _item_code AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'item not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_inventory WHERE user_id = uid AND item_code = _item_code) THEN
    RAISE EXCEPTION 'already owned';
  END IF;
  IF item.premium_only THEN
    SELECT COALESCE(is_premium, false) INTO is_prem FROM public.user_progress WHERE user_id = uid;
    IF NOT COALESCE(is_prem, false) THEN RAISE EXCEPTION 'premium required'; END IF;
  END IF;
  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT coins INTO bal FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF bal < item.price_coins THEN RAISE EXCEPTION 'insufficient coins'; END IF;
  UPDATE public.wallets SET coins = coins - item.price_coins, updated_at = now() WHERE user_id = uid;
  INSERT INTO public.user_inventory (user_id, item_code) VALUES (uid, _item_code);
  IF item.price_coins > 0 THEN
    INSERT INTO public.coin_transactions (user_id, amount, source, reference)
      VALUES (uid, -item.price_coins, 'purchase', _item_code);
  END IF;
  RETURN jsonb_build_object('ok', true, 'item_code', _item_code, 'balance', bal - item.price_coins);
END; $$;
REVOKE ALL ON FUNCTION public.purchase_item(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_item(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_progress (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

INSERT INTO public.wallets (user_id)
  SELECT id FROM auth.users
  ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.shop_items (code, type, name, description, price_coins, premium_only, rarity, icon, sort_order) VALUES
  ('av_stethoscope','avatar','Stéthoscope','Le classique indémodable',0,false,'common','🩺',10),
  ('av_ambulance','avatar','Ambulance','Prêt à intervenir',100,false,'common','🚑',20),
  ('av_heart','avatar','Cœur','Pour les futurs cardios',150,false,'common','❤️',30),
  ('av_brain','avatar','Cerveau','Neuro forever',150,false,'rare','🧠',40),
  ('av_lungs','avatar','Poumons','Respire à fond',200,false,'rare','🫁',50),
  ('av_dna','avatar','ADN','Génétique',300,false,'epic','🧬',60),
  ('av_syringe','avatar','Seringue','Toujours prêt',200,false,'rare','💉',70),
  ('av_microscope','avatar','Microscope','Chercheur né',400,false,'epic','🔬',80),
  ('av_crown','avatar','Couronne d''or','Réservé aux Premium',0,true,'legendary','👑',90),
  ('av_dragon','avatar','Dragon médical','Légendaire — Premium',0,true,'legendary','🐉',100),
  ('fr_bronze','frame','Cadre Bronze','Ton premier cadre',50,false,'common','🥉',110),
  ('fr_silver','frame','Cadre Argent','Élégant',300,false,'rare','🥈',120),
  ('fr_gold','frame','Cadre Or','Prestigieux',800,false,'epic','🥇',130),
  ('fr_diamond','frame','Cadre Diamant','Ultime — Premium',0,true,'legendary','💎',140),
  ('bg_hospital','background','Hôpital','Ambiance clinique',150,false,'common','🏥',150),
  ('bg_ecg','background','ECG','Rythme sinusal',250,false,'rare','📈',160),
  ('bg_xray','background','Radio','Vision perçante',350,false,'epic','🦴',170),
  ('bg_aurora','background','Aurore','Rare — Premium',0,true,'legendary','🌌',180),
  ('chest_small','chest','Petit coffre','10 à 30 pièces surprises',100,false,'common','📦',200),
  ('chest_big','chest','Gros coffre','50 à 150 pièces',400,false,'rare','🎁',210),
  ('chest_epic','chest','Coffre épique','Item rare garanti',900,false,'epic','🏆',220),
  ('ti_novice','title','Titre : Novice','Affiché sous ton pseudo',0,false,'common','🎓',230),
  ('ti_secouriste','title','Titre : Secouriste','Prouve ta vocation',300,false,'rare','⛑️',240),
  ('ti_legend','title','Titre : Légende','Premium uniquement',0,true,'legendary','🌟',250)
ON CONFLICT (code) DO NOTHING;
