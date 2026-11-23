import { loginSchema, signUpSchema, changePasswordSchema } from '../authSchemas';

describe('authSchemas security policy', () => {
  it('keeps legacy 6-char login compatibility while enforcing strong passwords on signup', () => {
    expect(
      loginSchema.safeParse({ email: 'user@example.com', password: '123456' }).success
    ).toBe(true);

    expect(
      signUpSchema.safeParse({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      }).success
    ).toBe(false);

    expect(
      signUpSchema.safeParse({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      }).success
    ).toBe(false);

    expect(
      signUpSchema.safeParse({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'PASSWORD123',
        confirmPassword: 'PASSWORD123',
      }).success
    ).toBe(false);

    expect(
      signUpSchema.safeParse({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'PasswordOnly',
        confirmPassword: 'PasswordOnly',
      }).success
    ).toBe(false);

    expect(
      signUpSchema.safeParse({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'Password1' + 'a'.repeat(56),
        confirmPassword: 'Password1' + 'a'.repeat(56),
      }).success
    ).toBe(false);

    expect(
      signUpSchema.safeParse({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      }).success
    ).toBe(true);
  });

  it('validates changePasswordSchema requiring strong new password different from current', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'OldPassword1',
        confirmPassword: 'OldPassword1',
      }).success
    ).toBe(false);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'weak',
        confirmPassword: 'weak',
      }).success
    ).toBe(false);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword2',
        confirmPassword: 'DifferentPassword3',
      }).success
    ).toBe(false);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: '123456',
        newPassword: 'NewPassword2',
        confirmPassword: 'NewPassword2',
      }).success
    ).toBe(true);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword2',
        confirmPassword: 'NewPassword2',
      }).success
    ).toBe(true);
  });
});
