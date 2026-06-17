-- Fix is_admin_user() — uses ur.email which doesn't exist on user_roles table.
-- Must use ur.user_id = auth.uid() instead (same fix applied to is_admin_or_dispatcher in 087).

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;
