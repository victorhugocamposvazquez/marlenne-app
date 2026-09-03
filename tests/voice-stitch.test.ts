import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  earAskSave, earAskTime, earAskTimeHoles, earHoraOcupada, earHueco, earHuecos,
  earMove, earNadie, earSaved, earTengo, earTodayCount,
} from '../lib/voice';
import { stitchVoice } from '../lib/voice-stitch';

test('plantilla sin nombre: guardo para mañana a las once', () => {
  const urls = stitchVoice(earAskSave(1, 11 * 60));
  assert.deepEqual(urls, [
    '/voice/la-guardo-para.mp3',
    '/voice/dia-manana.mp3',
    '/voice/a-las.mp3',
    '/voice/hora-660.mp3',
  ]);
});

test('guardo la cita para hoy a la una', () => {
  const urls = stitchVoice(earSaved(0, 13 * 60));
  assert.deepEqual(urls, [
    '/voice/guardo-cita-para.mp3',
    '/voice/dia-hoy.mp3',
    '/voice/a-la.mp3',
    '/voice/hora-780.mp3',
  ]);
});

test('once y media y de acuerdo al mover', () => {
  const urls = stitchVoice(earMove(1, 11 * 60 + 30));
  assert.deepEqual(urls, [
    '/voice/la-paso-a.mp3',
    '/voice/dia-manana.mp3',
    '/voice/a-las.mp3',
    '/voice/hora-690.mp3',
    '/voice/de-acuerdo.mp3',
  ]);
});

test('hueco y nadie sin nombres', () => {
  assert.deepEqual(stitchVoice(earHueco(1, 10 * 60)), [
    '/voice/hay-hueco.mp3',
    '/voice/dia-manana.mp3',
    '/voice/a-las.mp3',
    '/voice/hora-600.mp3',
  ]);
  assert.deepEqual(stitchVoice(earNadie(0, 16 * 60)), [
    '/voice/nadie-libre-cuando.mp3',
    '/voice/dia-hoy.mp3',
    '/voice/a-las.mp3',
    '/voice/hora-960.mp3',
  ]);
});

test('preguntar hora: clip entero hoy, plantilla otro día', () => {
  assert.deepEqual(stitchVoice(earAskTime(0)), ['/voice/a-que-hora.mp3']);
  assert.deepEqual(stitchVoice(earAskTime(1)), [
    '/voice/a-que-hora-para.mp3',
    '/voice/dia-manana.mp3',
  ]);
});

test('tengo horas sueltas, sin nombres', () => {
  assert.equal(earTengo([11 * 60, 11 * 60 + 30, 12 * 60]), 'Tengo once, once y media o doce.');
  assert.deepEqual(stitchVoice(earTengo([11 * 60, 11 * 60 + 30, 12 * 60])), [
    '/voice/tengo.mp3',
    '/voice/hora-660.mp3',
    '/voice/hora-690.mp3',
    '/voice/hora-720.mp3',
  ]);
  assert.deepEqual(stitchVoice(earHuecos(1, [10 * 60, 16 * 60])), [
    '/voice/huecos.mp3',
    '/voice/dia-manana.mp3',
    '/voice/tengo.mp3',
    '/voice/hora-600.mp3',
    '/voice/hora-960.mp3',
  ]);
  assert.deepEqual(stitchVoice(earHuecos(0, [11 * 60])), [
    '/voice/tengo.mp3',
    '/voice/hora-660.mp3',
  ]);
});

test('preguntar hora con huecos es una plantilla', () => {
  assert.deepEqual(stitchVoice(earAskTimeHoles(0, [11 * 60, 12 * 60])), [
    '/voice/a-que-hora.mp3',
    '/voice/tengo.mp3',
    '/voice/hora-660.mp3',
    '/voice/hora-720.mp3',
  ]);
  assert.deepEqual(stitchVoice(earAskTimeHoles(1, [11 * 60])), [
    '/voice/a-que-hora-para.mp3',
    '/voice/dia-manana.mp3',
    '/voice/tengo.mp3',
    '/voice/hora-660.mp3',
  ]);
  assert.deepEqual(stitchVoice(earHoraOcupada([11 * 60 + 30])), [
    '/voice/esa-hora-no-libre.mp3',
    '/voice/tengo.mp3',
    '/voice/hora-690.mp3',
  ]);
});

test('conteo de hoy es clip fijo; un nombre no se cose', () => {
  assert.equal(stitchVoice(earTodayCount(0))?.[0], '/voice/hoy-no-hay-citas.mp3');
  assert.equal(stitchVoice(earTodayCount(5))?.[0], '/voice/hoy-hay-cinco-citas.mp3');
  assert.equal(stitchVoice('Cita para Lucía a las once'), null);
});
