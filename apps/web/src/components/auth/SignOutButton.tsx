import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        window.location.assign('/');
      }}
    >
      Cerrar sesión
    </Button>
  );
}
