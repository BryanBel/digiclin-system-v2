import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  authCall,
  Field,
  FormAlert,
  PasswordInput,
  SubmitButton,
  text,
  useAction,
} from '@/components/forms/form';
import { Input } from '@/components/ui/input';

/** Pide el enlace. La respuesta es la misma exista o no la cuenta (no revela quien es paciente). */
export function ForgotPasswordForm() {
  const { pending, error, run } = useAction();
  const [done, setDone] = useState(false);

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = text(new FormData(event.currentTarget), 'email');
    return run(async () => {
      await authCall(authClient.requestPasswordReset({ email, redirectTo: '/restablecer' }));
      setDone(true);
    });
  };

  if (done) {
    return (
      <FormAlert tone="ok">
        Si hay una cuenta con ese correo, te enviamos un enlace para elegir una contraseña nueva.
        Vence en 1 hora.
      </FormAlert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Correo de tu cuenta">
        {(props) => <Input {...props} name="email" type="email" autoComplete="email" required />}
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <SubmitButton pending={pending}>Enviar enlace</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { pending, error, setError, run } = useAction();
  const [done, setDone] = useState(false);

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('password') ?? '');
    if (newPassword.length < 12) return setError('Usa al menos 12 caracteres.');
    if (newPassword !== form.get('confirm')) return setError('Las contraseñas no coinciden.');

    return run(async () => {
      await authCall(authClient.resetPassword({ newPassword, token }));
      setDone(true);
    });
  };

  if (done) {
    return (
      <FormAlert tone="ok">
        Listo, tu contraseña cambió y se cerraron las demás sesiones.{' '}
        <a href="/ingresar" className="font-medium underline">
          Entrar
        </a>
      </FormAlert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Contraseña nueva" hint="Mínimo 12 caracteres.">
        {(props) => (
          <PasswordInput {...props} name="password" autoComplete="new-password" required />
        )}
      </Field>
      <Field label="Repite la contraseña">
        {(props) => (
          <PasswordInput {...props} name="confirm" autoComplete="new-password" required />
        )}
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <SubmitButton pending={pending}>Guardar contraseña</SubmitButton>
    </form>
  );
}

export function ResendVerificationForm({ callbackURL }: { callbackURL: string }) {
  const { pending, error, run } = useAction();
  const [done, setDone] = useState(false);

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = text(new FormData(event.currentTarget), 'email');
    return run(async () => {
      await authCall(authClient.sendVerificationEmail({ email, callbackURL }));
      setDone(true);
    });
  };

  if (done) {
    return (
      <FormAlert tone="ok">
        Si la cuenta existe y no está confirmada, te enviamos un enlace nuevo.
      </FormAlert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Correo de tu cuenta">
        {(props) => <Input {...props} name="email" type="email" autoComplete="email" required />}
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <SubmitButton pending={pending}>Enviar un enlace nuevo</SubmitButton>
    </form>
  );
}
