/**
 * NexusSipWeb.js — browser fallback pro NexusSipPlugin
 * V prohlížeči plugin nefunguje nativně — slouží jen pro dev/debug.
 */
import { WebPlugin } from '@capacitor/core';

export class NexusSipWeb extends WebPlugin {
  async initialize() {
    console.warn('[NexusSip] Nativní SIP není dostupný v prohlížeči.');
    return { connecting: false };
  }
  async answer()   { return {}; }
  async reject()   { return {}; }
  async hangup()   { return {}; }
  async mute()     { return { muted: false }; }
  async setSpeaker() { return { speaker: false }; }
  async getCallHistory() { return { calls: [] }; }
}
