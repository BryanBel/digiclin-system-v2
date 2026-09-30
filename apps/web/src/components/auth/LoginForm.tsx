import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { errorMessage } from '@/lib/errors';
import { safeNext, withNext } from '@/lib/safe-next';
import {
  Field,
  FormAlert,
  PasswordInput,
  SubmitButton,
  text,
  UserFacingError,
  useAction,
} from '@/components/forms/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function LoginForm({ next }: { next: string | null }) {
  const { pending, error, run } = useAction();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = text(form, 'email');
    setUnverifiedEmail(null);

    return run(async () => {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password: String(form.get('password') ?? ''),
      });
      if (authError) {
        if (authError.code === 'EMAIL_NOT_VERIFIED') setUnverifiedEmail(email);
        throw new UserFacingError(errorMessage(authError));
      }
      // Con 2FA activa, el plugin ya redirige a /ingresar/dos-pasos.
      if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) return;
      window.location.assign(safeNext(next) ?? '/cuenta');
    });
  };

  const resend = () =>
    run(async () => {
      await authClient.sendVerificationEmail({
        email: unverifiedEmail!,
        callbackURL: withNext('/correo-verificado', next),
      });
      setResent(true);
    });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Correo">
        {(props) => <Input {...props} name="email" type="email" autoComplete="email" required />}
      </Field>
      <Field label="Contraseña">
        {(props) => (
          <PasswordInput {...props} name="password" autoComplete="current-password" required />
        )}
      </Field>

      {error && <FormAlert>{error}</FormAlert>}
      {unverifiedEmail && !resent && (
        <Button type="button" variant="outline" onClick={resend} disabled={pending}>
          Reenviar el correo de confirmación
        </Button>
      )}
      {resent && <FormAlert tone="ok">Te enviamos un nuevo enlace. Revisa tu correo.</FormAlert>}

      <SubmitButton pending={pending}>Entrar</SubmitButton>
      <a href="/recuperar" className="text-sm underline-offset-4 hover:underline">
        ¿Olvidaste tu contraseña?
      </a>
    </form>
  );
}
