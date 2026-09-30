import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { withNext } from '@/lib/safe-next';
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

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>;

const MIN_PASSWORD = 12;

export function SignUpForm({ next, email: presetEmail }: { next: string | null; email?: string }) {
  const { pending, error, run } = useAction();
  const [errors, setErrors] = useState<Errors>({});
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = text(form, 'name');
    const email = text(form, 'email');
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    const found: Errors = {};
    if (name.length < 2) found.name = 'Escribe tu nombre completo.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) found.email = 'Escribe un correo válido.';
    if (password.length < MIN_PASSWORD) {
      found.password = `Usa al menos ${MIN_PASSWORD} caracteres. Una frase es más fácil de recordar.`;
    }
    if (confirm !== password) found.confirm = 'Las contraseñas no coinciden.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    return run(async () => {
      await authCall(
        authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: withNext('/correo-verificado', next),
        }),
      );
      setSentTo(email);
    });
  };

  if (sentTo) {
    return (
      <FormAlert tone="ok">
        Te enviamos un enlace a <strong>{sentTo}</strong> para confirmar tu correo. Vence en 24
        horas. Si no lo ves, revisa la carpeta de correo no deseado.
      </FormAlert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field label="Nombre completo" error={errors.name}>
        {(props) => <Input {...props} name="name" autoComplete="name" required />}
      </Field>
      <Field label="Correo" error={errors.email}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={presetEmail}
            required
          />
        )}
      </Field>
      <Field
        label="Contraseña"
        hint={`Mínimo ${MIN_PASSWORD} caracteres. No uses una que tengas en otro sitio.`}
        error={errors.password}
      >
        {(props) => (
          <PasswordInput {...props} name="password" autoComplete="new-password" required />
        )}
      </Field>
      <Field label="Repite la contraseña" error={errors.confirm}>
        {(props) => (
          <PasswordInput {...props} name="confirm" autoComplete="new-password" required />
        )}
      </Field>

      {error && <FormAlert>{error}</FormAlert>}
      <SubmitButton pending={pending}>Crear cuenta</SubmitButton>
    </form>
  );
}
