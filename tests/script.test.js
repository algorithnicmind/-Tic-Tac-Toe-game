const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('Tic-Tac-Toe Game Tests', () => {
  beforeEach(() => {
    // Mock AudioContext to prevent errors in JSDOM
    window.AudioContext = jest.fn().mockImplementation(() => ({
      createOscillator: jest.fn(() => ({
        type: 'sine',
        frequency: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), value: 0 },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        disconnect: jest.fn()
      })),
      createGain: jest.fn(() => ({
        gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), value: 0 },
        connect: jest.fn(),
      })),
      destination: {},
      currentTime: 0,
      state: 'running',
      resume: jest.fn()
    }));
    
    // Set up our document body
    document.body.innerHTML = html;
    
    // Clear localStorage
    localStorage.clear();
    
    // Load script
    jest.isolateModules(() => {
      require('../script.js');
      // Trigger DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('UI should render correctly and show Home section by default', () => {
    const homeSection = document.getElementById('home');
    expect(homeSection.classList.contains('active')).toBe(true);
  });

  test('Navigation buttons should switch active sections', () => {
    const aboutLink = document.querySelector('a[data-target="about"]');
    aboutLink.click();
    
    const aboutSection = document.getElementById('about');
    expect(aboutSection.classList.contains('active')).toBe(true);
  });

  test('Login should work and update the UI', () => {
    const getStartedBtn = document.getElementById('get-started-btn');
    getStartedBtn.click();
    
    const authSection = document.getElementById('auth');
    expect(authSection.classList.contains('active')).toBe(true);
    
    const loginUsername = document.getElementById('login-username');
    loginUsername.value = 'TestUser';
    
    const loginForm = document.getElementById('login-form');
    loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
    
    const navAuth = document.getElementById('nav-user-info');
    expect(navAuth.innerHTML).toContain('TestUser');
    
    const selectionSection = document.getElementById('selection');
    expect(selectionSection.classList.contains('active')).toBe(true);
  });
  
  test('Playing a game should work in PvP mode', () => {
    // Navigate and login
    const loginForm = document.getElementById('login-form');
    document.getElementById('login-username').value = 'TestUser';
    loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
    
    // Start game
    document.getElementById('start-game-btn').click();
    
    // Check game section
    const gameSection = document.getElementById('game');
    expect(gameSection.classList.contains('active')).toBe(true);
    
    // Simulate game
    const cells = document.querySelectorAll('.cell');
    
    // Player X
    cells[0].click();
    expect(cells[0].innerText).toBe('X');
    
    // Player O
    cells[1].click();
    expect(cells[1].innerText).toBe('O');
  });

  test('Audio toggle should update UI and state', () => {
    let audioBtn = document.getElementById('audio-toggle-btn');
    expect(audioBtn.textContent).toBe('🔇');
    audioBtn.click();
    audioBtn = document.getElementById('audio-toggle-btn'); // Re-fetch in case it gets re-rendered
    expect(audioBtn.textContent).toBe('🔊');
    audioBtn.click();
    audioBtn = document.getElementById('audio-toggle-btn');
    expect(audioBtn.textContent).toBe('🔇');
  });

  test('Grid size selection should create correct number of cells', () => {
    // Select 4x4
    const gridSizeSelect = document.getElementById('grid-size');
    gridSizeSelect.value = '4';
    
    document.getElementById('start-game-btn').click();
    const cells = document.querySelectorAll('.cell');
    expect(cells.length).toBe(16);
  });

  test('Game controls like restart and exit should function properly', () => {
    document.getElementById('start-game-btn').click();
    
    // Play a move
    const cells = document.querySelectorAll('.cell');
    cells[0].click();
    expect(cells[0].innerText).toBe('X');
    
    // Restart game
    document.getElementById('restart-btn').click();
    const newCells = document.querySelectorAll('.cell');
    expect(newCells[0].innerText).toBe('');
    
    // Exit game
    document.getElementById('exit-game-btn').click();
    const selectionSection = document.getElementById('selection');
    expect(selectionSection.classList.contains('active')).toBe(true);
  });
});
