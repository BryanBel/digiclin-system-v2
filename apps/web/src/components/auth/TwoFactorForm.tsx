import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { safeNext } from '@/lib/safe-next';
import { authCall, Field, FormAlert, SubmitButton, text, useAction } from '@/components/forms/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function TwoFactorForm({ next }: { next: string | null }) {
  const { pending, error, run } = useAction();
  const [useBackup, setUseBackup] = useState(false);

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = text(form, 'code').replace(/\s/g, '');
    const trustDevice = form.get('trust') === 'on';

    return run(async () => {
      await authCall(
        useBackup
          ? authClient.twoFactor.verifyBackupCode({ code, trustDevice })
          : authClient.twoFactor.verifyTotp({ code, trustDevice }),
      );
      window.location.assign(safeNext(next) ?? '/cuenta');
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field
        label={useBackup ? 'Código de respaldo' : 'Código de 6 dígitos'}
        hint={
          useBackup
            ? 'Cada código de respaldo sirve una sola vez.'
            : 'Ábrelo en tu aplicación de autenticación.'
        }
      >
        {(props) => (
          <Input
            {...props}
            name="code"
            inputMode={useBackup ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            autoFocus
            required
          />
        )}
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="trust" className="mt-1" />
        <span>
          Confiar en este dispositivo por 30 días.{' '}
          <span className="text-muted-foreground">No lo marques en computadoras compartidas.</span>
        </span>
      </label>

      {error && <FormAlert>{error}</FormAlert>}
      <SubmitButton pending={pending}>Verificar</SubmitButton>
      <Button type="button" variant="link" onClick={() => setUseBackup((v) => !v)}>
        {useBackup ? 'Usar el código de la aplicación' : 'Usar un código de respaldo'}
      </Button>
    </form>
  );
}
