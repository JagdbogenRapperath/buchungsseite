/**
 * JAGDHÜTTE – Buchungssystem Frontend
 * Backend: Google Apps Script Web-App
 */

// ============================================================
// !! HIER IHRE GOOGLE APPS SCRIPT URL EINTRAGEN !!
// (Nach dem Bereitstellen der Web-App kopieren)
// ============================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwBSdMOlrW2ujeSBQDfRJPkF5-Iz_5VcrOZybX4mPTWCWNQiaJW56AMxjV8MqAFfW_Ucg/exec';

// ============================================================
// STATE
// ============================================================
let state = {
  selectedRoom: null,
  availabilityTimeout: null,
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setupRoomSelection();
  setupDateListeners();
  setMinDates();
});

function setMinDates() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('arrival').min = today;
  document.getElementById('departure').min = today;
}

function setupRoomSelection() {
  document.querySelectorAll('.room-option').forEach(label => {
    label.addEventListener('click', () => {
      document.querySelectorAll('.room-option').forEach(l => l.classList.remove('selected'));
      label.classList.add('selected');
      state.selectedRoom = label.querySelector('input[type="radio"]').value;
      checkAvailabilityIfReady();
    });
  });
}

function setupDateListeners() {
  const arrival   = document.getElementById('arrival');
  const departure = document.getElementById('departure');

  arrival.addEventListener('change', () => {
    if (arrival.value) {
      const min = new Date(arrival.value);
      min.setDate(min.getDate() + 1);
      departure.min = min.toISOString().split('T')[0];
      if (departure.value && departure.value <= arrival.value) {
        departure.value = '';
        hideAvailability();
      }
    }
    checkAvailabilityIfReady();
  });

  departure.addEventListener('change', checkAvailabilityIfReady);
}

// ============================================================
// VERFÜGBARKEIT
// ============================================================
function checkAvailabilityIfReady() {
  const arrival   = document.getElementById('arrival').value;
  const departure = document.getElementById('departure').value;
  if (!arrival || !departure || !state.selectedRoom) return;
  if (arrival >= departure) return;

  clearTimeout(state.availabilityTimeout);
  state.availabilityTimeout = setTimeout(() => {
    checkAvailability(state.selectedRoom, arrival, departure);
  }, 500);
}

async function checkAvailability(room, arrival, departure) {
  showAvailability('loading', '⏳ Verfügbarkeit wird geprüft...');
  try {
    const url = `${SCRIPT_URL}?action=check&room=${encodeURIComponent(room)}&arrival=${arrival}&departure=${departure}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.available) {
      showAvailability('available', `✅ ${room} ist in diesem Zeitraum verfügbar!`);
    } else {
      showAvailability('unavailable', `❌ ${room} ist leider nicht verfügbar. Bitte anderen Zeitraum wählen.`);
    }
  } catch {
    showAvailability('unavailable', '⚠️ Verfügbarkeit konnte nicht geprüft werden.');
  }
}

function showAvailability(type, msg) {
  const el = document.getElementById('availability-msg');
  el.textContent = msg;
  el.className   = `availability-msg ${type}`;
  el.style.display = 'block';
}

function hideAvailability() {
  document.getElementById('availability-msg').style.display = 'none';
}

// ============================================================
// BUCHUNG ABSENDEN
// ============================================================
async function submitBooking() {
  const room      = state.selectedRoom;
  const arrival   = document.getElementById('arrival').value;
  const departure = document.getElementById('departure').value;
  const vorname   = document.getElementById('vorname').value.trim();
  const nachname  = document.getElementById('nachname').value.trim();
  const email     = document.getElementById('email').value.trim();
  const telefon   = document.getElementById('telefon').value.trim();
  const nachricht = document.getElementById('nachricht').value.trim();
  const datenschutz = document.getElementById('datenschutz').checked;

  const errors = [];
  if (!room)                        errors.push('Bitte wählen Sie ein Zimmer.');
  if (!arrival)                     errors.push('Bitte Anreisedatum angeben.');
  if (!departure)                   errors.push('Bitte Abreisedatum angeben.');
  if (arrival >= departure)         errors.push('Abreise muss nach Anreise liegen.');
  if (!vorname)                     errors.push('Bitte Vornamen eingeben.');
  if (!nachname)                    errors.push('Bitte Nachnamen eingeben.');
  if (!email || !email.includes('@')) errors.push('Bitte gültige E-Mail eingeben.');
  if (!datenschutz)                 errors.push('Bitte Datenschutzerklärung zustimmen.');

  if (errors.length > 0) { showError(errors.join('<br>')); return; }
  hideError();

  const btn = document.getElementById('submit-btn');
  btn.classList.add('loading');
  btn.textContent = 'Buchung wird verarbeitet...';

  try {
    const res  = await fetch(SCRIPT_URL, {
      method:  'POST',
      // Google Apps Script erfordert text/plain für CORS-freie POST-Anfragen
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify({ room, arrival, departure, vorname, nachname, email, telefon, nachricht }),
    });
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    showSuccess(room, arrival, departure, vorname, nachname);
  } catch (err) {
    showError('❌ ' + (err.message || 'Unbekannter Fehler. Bitte kontaktieren Sie uns direkt.'));
  } finally {
    btn.classList.remove('loading');
    btn.textContent = 'Buchung verbindlich absenden';
  }
}

// ============================================================
// UI-HELPER
// ============================================================
function showError(html) {
  const el = document.getElementById('form-error');
  el.innerHTML = html;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
  document.getElementById('form-error').style.display = 'none';
}

function showSuccess(room, arrival, departure, vorname, nachname) {
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('de-DE',
    { day: '2-digit', month: 'long', year: 'numeric' });

  document.getElementById('success-text').textContent =
    `${vorname} ${nachname}, Ihr ${room} ist vom ${fmt(arrival)} bis ${fmt(departure)} gebucht.`;

  document.querySelector('.booking-wrapper').style.display = 'none';
  document.getElementById('success-overlay').style.display = 'block';
  document.getElementById('success-overlay').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetForm() {
  document.getElementById('success-overlay').style.display = 'none';
  document.querySelector('.booking-wrapper').style.display = 'block';
  document.querySelectorAll('.room-option').forEach(l => l.classList.remove('selected'));
  document.querySelectorAll('input:not([type="radio"]), textarea').forEach(el => el.value = '');
  document.getElementById('datenschutz').checked = false;
  hideAvailability();
  hideError();
  state.selectedRoom = null;
  document.getElementById('buchung').scrollIntoView({ behavior: 'smooth' });
}
