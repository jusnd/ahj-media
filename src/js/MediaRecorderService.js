/**
 * Обертка над MediaRecorder API для записи аудио и видео.
 */
export default class MediaRecorderService {
  constructor() {
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }

  /**
   * Поддерживается ли запись медиа в текущем браузере.
   * @returns {boolean}
   */
  static isSupported() {
    return Boolean(
      navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function'
      && typeof window.MediaRecorder === 'function',
    );
  }

  /**
   * Начинает запись. Запрашивает у пользователя доступ к микрофону/камере.
   *
   * @param {'audio'|'video'} type тип записи
   * @returns {Promise<void>} reject, если API недоступно или доступ не выдан
   */
  async start(type) {
    const constraints = type === 'video'
      ? { audio: true, video: true }
      : { audio: true };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.recorder = new MediaRecorder(this.stream);
    this.chunks = [];

    this.recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });

    this.recorder.start();
  }

  /**
   * Завершает запись и возвращает записанные данные.
   * @returns {Promise<Blob>}
   */
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.recorder || this.recorder.state === 'inactive') {
        reject(new Error('Запись не была начата'));
        return;
      }

      const recorder = this.recorder;
      recorder.addEventListener('stop', () => {
        const blob = new Blob(this.chunks, { type: recorder.mimeType || undefined });
        this.cleanup();
        resolve(blob);
      }, { once: true });

      recorder.stop();
    });
  }

  /**
   * Прерывает запись без сохранения результата.
   */
  cancel() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    this.cleanup();
  }

  /**
   * Освобождает микрофон/камеру и сбрасывает состояние.
   */
  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }
}
