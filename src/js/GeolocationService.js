/**
 * Запрашивает текущие гео-координаты пользователя через Geolocation API.
 *
 * @param {number} [timeout=10000] таймаут ожидания ответа, мс
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export default function getCurrentPosition(timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation API не поддерживается браузером'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout,
      },
    );
  });
}
