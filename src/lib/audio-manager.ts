import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

type SoundName = 'plant' | 'water' | 'harvest' | 'coin' | 'rain' | 'levelup' | 'error' | 'click';

class AudioManager {
  private sounds: { [key: string]: Audio.Sound | null } = {};
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  async init() {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Précharger les sons (quand les fichiers existent)
      // await this.loadSound('plant', require('@/assets/sounds/plant.mp3'));
      // await this.loadSound('water', require('@/assets/sounds/water.mp3'));
      // await this.loadSound('harvest', require('@/assets/sounds/harvest.mp3'));
      // await this.loadSound('coin', require('@/assets/sounds/coin.mp3'));
      // await this.loadSound('rain', require('@/assets/sounds/rain.mp3'));
      // await this.loadSound('levelup', require('@/assets/sounds/levelup.mp3'));
      // await this.loadSound('error', require('@/assets/sounds/error.mp3'));
      // await this.loadSound('click', require('@/assets/sounds/click.mp3'));

      this.isInitialized = true;
      console.log('🔊 Audio manager initialized (Haptics fallback active)');
    } catch (error) {
      console.error('Failed to init audio:', error);
    }
  }

  async loadSound(name: string, source: any) {
    try {
      const { sound } = await Audio.Sound.createAsync(source);
      this.sounds[name] = sound;
    } catch (error) {
      console.error(`Failed to load sound ${name}:`, error);
      this.sounds[name] = null;
    }
  }

  async play(name: SoundName, volume: number = 1.0) {
    if (this.isMuted) return;

    const sound = this.sounds[name];

    // Fallback: utilise Haptics si son manquant
    if (!sound) {
      this.playHapticFallback(name);
      return;
    }

    try {
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(volume);
      await sound.playAsync();
    } catch (error) {
      console.error(`Failed to play sound ${name}:`, error);
      this.playHapticFallback(name);
    }
  }

  private playHapticFallback(name: SoundName) {
    switch (name) {
      case 'plant':
      case 'water':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'harvest':
      case 'levelup':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'coin':
      case 'click':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  async playLoop(name: string, volume: number = 0.3) {
    if (this.isMuted) return;

    const sound = this.sounds[name];
    if (!sound) return;

    try {
      await sound.setIsLoopingAsync(true);
      await sound.setVolumeAsync(volume);
      await sound.playAsync();
    } catch (error) {
      console.error(`Failed to loop sound ${name}:`, error);
    }
  }

  async stop(name: string) {
    const sound = this.sounds[name];
    if (!sound) return;

    try {
      await sound.stopAsync();
    } catch (error) {
      console.error(`Failed to stop sound ${name}:`, error);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      // Arrêter tous les sons en boucle
      Object.keys(this.sounds).forEach((key) => {
        this.stop(key);
      });
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  async cleanup() {
    for (const sound of Object.values(this.sounds)) {
      if (sound) {
        await sound.unloadAsync();
      }
    }
    this.sounds = {};
    this.isInitialized = false;
  }
}

export const audioManager = new AudioManager();
