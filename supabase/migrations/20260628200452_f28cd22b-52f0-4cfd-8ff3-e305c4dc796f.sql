
DO $$
DECLARE
  new_uid uuid := gen_random_uuid();
  hashed text;
BEGIN
  hashed := crypt('Staff1209!', gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated', 'authenticated',
    'staff@halalmiddleman.net', hashed, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"Staff","display_name":"Staff"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_uid,
    jsonb_build_object('sub', new_uid::text, 'email', 'staff@halalmiddleman.net', 'email_verified', true),
    'email', new_uid::text, now(), now(), now());

  ALTER TABLE public.user_roles DISABLE TRIGGER USER;
  INSERT INTO public.user_roles (user_id, role) VALUES (new_uid, 'admin'::public.app_role)
  ON CONFLICT DO NOTHING;
  ALTER TABLE public.user_roles ENABLE TRIGGER USER;
END $$;
