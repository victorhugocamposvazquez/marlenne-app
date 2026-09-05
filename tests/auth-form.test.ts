import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  signupRole,
  validateSignIn,
  validateSignUp,
} from '../lib/auth-form';

test('el email se guarda en minúsculas', () => {
  assert.equal(normalizeEmail('  Hugo@Marlen.es '), 'hugo@marlen.es');
});

test('entrar pide email y contraseña', () => {
  assert.equal(validateSignIn({ email: '', password: 'secret12' }), 'Pon un email válido');
  assert.equal(validateSignIn({ email: 'a@b.com', password: '' }), 'Pon la contraseña');
  assert.equal(validateSignIn({ email: 'a@b.com', password: 'x' }), null);
});

test('crear cuenta pide nombre, email y dos contraseñas iguales', () => {
  assert.equal(validateSignUp({ name: 'A', email: 'a@b.com', password: 'secret12', confirm: 'secret12' }), 'Pon tu nombre');
  assert.equal(validateSignUp({ name: 'Hugo', email: 'mal', password: 'secret12', confirm: 'secret12' }), 'Pon un email válido');
  assert.equal(validateSignUp({ name: 'Hugo', email: 'a@b.com', password: '123', confirm: '123' }), 'Mínimo 8 caracteres');
  assert.equal(validateSignUp({ name: 'Hugo', email: 'a@b.com', password: 'secret12', confirm: 'otra' }), 'Las contraseñas no coinciden');
  assert.equal(validateSignUp({ name: 'Hugo', email: 'a@b.com', password: 'secret12', confirm: 'secret12' }), null);
});

test('el primero del centro es dirección; el resto, recepción', () => {
  assert.equal(signupRole(0), 'admin');
  assert.equal(signupRole(3), 'reception');
});
