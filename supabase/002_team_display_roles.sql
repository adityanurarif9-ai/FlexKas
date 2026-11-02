-- Label jabatan saja; tidak mengubah akun, izin akses, atau catatan kas.
begin;
update public.flex_members set display_role='Keamanan' where member_key='kiandra';
update public.flex_members set display_role='Kreatif' where member_key='bima';
commit;
