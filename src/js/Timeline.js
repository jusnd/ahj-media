import getCurrentPosition from './GeolocationService';
import parseCoordinates from './parseCoordinates';
import MediaRecorderService from './MediaRecorderService';

/**
 * Главный контроллер приложения Timeline.
 * Управляет лентой постов, панелью ввода, записью медиа
 * и модальным окном ручного ввода координат.
 */
export default class Timeline {
  constructor() {
    this.posts = [];
    this.recorder = new MediaRecorderService();

    this.recordingType = null; // 'audio' | 'video'
    this.recStartedAt = null;
    this.recTimerId = null;
    this.toastId = null;

    // Данные поста, ожидающего ручного ввода координат
    this.pendingPost = null;

    this.el = {
      posts: document.getElementById('posts'),
      empty: document.getElementById('postsEmpty'),
      input: document.getElementById('postInput'),
      normal: document.getElementById('composerNormal'),
      recording: document.getElementById('composerRecording'),
      audioBtn: document.getElementById('audioBtn'),
      videoBtn: document.getElementById('videoBtn'),
      recOk: document.getElementById('recOkBtn'),
      recCancel: document.getElementById('recCancelBtn'),
      recTimer: document.getElementById('recTimer'),
      modal: document.getElementById('coordsModal'),
      modalInput: document.getElementById('coordsInput'),
      modalError: document.getElementById('coordsError'),
      modalOk: document.getElementById('coordsOk'),
      modalCancel: document.getElementById('coordsCancel'),
      videoPreview: document.getElementById('videoPreview'),
      videoPreviewEl: document.getElementById('videoPreviewEl'),
      toast: document.getElementById('toast'),
    };
  }

  init() {
    this.el.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.onTextSubmit();
      }
    });

    this.el.audioBtn.addEventListener('click', () => this.startRecording('audio'));
    this.el.videoBtn.addEventListener('click', () => this.startRecording('video'));
    this.el.recOk.addEventListener('click', () => this.finishRecording(true));
    this.el.recCancel.addEventListener('click', () => this.finishRecording(false));

    this.el.modalOk.addEventListener('click', () => this.onModalSubmit());
    this.el.modalCancel.addEventListener('click', () => this.onModalCancel());
    this.el.modalInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.onModalSubmit();
      }
    });
    this.el.modalInput.addEventListener('input', () => this.setModalInvalid(false));
  }

  /* ---------- Текстовые посты ---------- */

  async onTextSubmit() {
    const text = this.el.input.value.trim();
    if (!text) {
      return;
    }
    this.el.input.value = '';

    try {
      const coords = await getCurrentPosition();
      this.addPost({ type: 'text', text, coords });
    } catch {
      this.pendingPost = { type: 'text', text };
      this.openCoordsModal();
    }
  }

  /* ---------- Запись аудио / видео ---------- */

  async startRecording(type) {
    if (this.recordingType) {
      return;
    }

    if (!MediaRecorderService.isSupported()) {
      this.showToast(
        'Ваш браузер не поддерживает запись аудио/видео. '
        + 'Пожалуйста, используйте другой браузер.',
      );
      return;
    }

    try {
      await this.recorder.start(type);
    } catch {
      const device = type === 'audio' ? 'микрофону' : 'камере и микрофону';
      this.showToast(
        `Не удалось получить доступ к ${device}. `
        + 'Разрешите доступ в настройках браузера и повторите попытку.',
      );
      return;
    }

    this.recordingType = type;
    this.recStartedAt = Date.now();

    this.el.normal.classList.add('hidden');
    this.el.recording.classList.remove('hidden');
    this.updateTimer();
    this.recTimerId = setInterval(() => this.updateTimer(), 250);

    if (type === 'video') {
      // Дублируется только изображение, без звука (muted)
      this.el.videoPreviewEl.srcObject = this.recorder.stream;
      this.el.videoPreview.classList.remove('hidden');
    }
  }

  async finishRecording(save) {
    if (!this.recordingType) {
      return;
    }

    clearInterval(this.recTimerId);
    this.recTimerId = null;

    const type = this.recordingType;
    this.recordingType = null;

    this.el.videoPreviewEl.srcObject = null;
    this.el.videoPreview.classList.add('hidden');
    this.el.recording.classList.add('hidden');
    this.el.normal.classList.remove('hidden');
    this.el.recTimer.textContent = '00:00';

    if (!save) {
      this.recorder.cancel();
      return;
    }

    let url;
    try {
      const blob = await this.recorder.stop();
      url = URL.createObjectURL(blob);
    } catch {
      this.showToast('Не удалось сохранить запись. Попробуйте ещё раз.');
      return;
    }

    try {
      const coords = await getCurrentPosition();
      this.addPost({ type, url, coords });
    } catch {
      this.pendingPost = { type, url };
      this.openCoordsModal();
    }
  }

  updateTimer() {
    const seconds = Math.floor((Date.now() - this.recStartedAt) / 1000);
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    this.el.recTimer.textContent = `${mm}:${ss}`;
  }

  /* ---------- Модальное окно ручного ввода координат ---------- */

  openCoordsModal() {
    this.el.modal.classList.remove('hidden');
    this.el.modalInput.value = '';
    this.setModalInvalid(false);
    this.el.modalInput.focus();
  }

  closeCoordsModal() {
    this.el.modal.classList.add('hidden');
  }

  onModalSubmit() {
    try {
      const coords = parseCoordinates(this.el.modalInput.value);
      this.setModalInvalid(false);
      this.closeCoordsModal();
      if (this.pendingPost) {
        this.addPost({ ...this.pendingPost, coords });
        this.pendingPost = null;
      }
    } catch (error) {
      // Исключение влияет на валидацию поля: подсвечиваем ввод и показываем текст ошибки
      this.setModalInvalid(true, error.message);
    }
  }

  onModalCancel() {
    this.pendingPost = null;
    this.setModalInvalid(false);
    this.closeCoordsModal();
  }

  setModalInvalid(invalid, message = 'Неверный формат координат') {
    this.el.modalInput.classList.toggle('invalid', invalid);
    this.el.modalError.textContent = message;
    this.el.modalError.classList.toggle('hidden', !invalid);
  }

  /* ---------- Лента ---------- */

  addPost(post) {
    const fullPost = { ...post, createdAt: new Date() };
    this.posts.unshift(fullPost);
    this.el.empty.classList.add('hidden');
    this.el.posts.prepend(Timeline.renderPost(fullPost));
  }

  static renderPost(post) {
    const article = document.createElement('article');
    article.className = `post post-${post.type}`;

    const body = document.createElement('div');
    body.className = 'post-body';

    if (post.type === 'text') {
      const text = document.createElement('p');
      text.className = 'post-text';
      text.textContent = post.text;
      body.append(text);
    } else if (post.type === 'audio') {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = post.url;
      body.append(audio);
    } else {
      const video = document.createElement('video');
      video.controls = true;
      video.src = post.url;
      body.append(video);
    }

    const footer = document.createElement('footer');
    footer.className = 'post-footer';

    const date = document.createElement('span');
    date.className = 'post-date';
    date.textContent = Timeline.formatDate(post.createdAt);

    const coords = document.createElement('span');
    coords.className = 'post-coords';
    coords.textContent = `[${post.coords.latitude.toFixed(5)}, ${post.coords.longitude.toFixed(5)}]`;

    footer.append(date, coords);
    article.append(body, footer);
    return article;
  }

  static formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} `
      + `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /* ---------- Уведомления ---------- */

  showToast(message) {
    this.el.toast.textContent = message;
    this.el.toast.classList.remove('hidden');
    clearTimeout(this.toastId);
    this.toastId = setTimeout(() => {
      this.el.toast.classList.add('hidden');
    }, 5000);
  }
}
