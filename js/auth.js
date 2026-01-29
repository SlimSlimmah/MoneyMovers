import { firebaseService } from './firebase.js';

class Auth {
    constructor() {
        this.isAuthenticated = false;
    }

    initialize() {
        // Setup form toggle handlers
        document.getElementById('showSignup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('signup');
        });

        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });

        document.getElementById('showReset')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('reset');
        });

        document.getElementById('backToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });

        // Setup form submissions
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            this.handleLogin();
        });

        document.getElementById('signupBtn')?.addEventListener('click', () => {
            this.handleSignup();
        });

        document.getElementById('resetBtn')?.addEventListener('click', () => {
            this.handleReset();
        });

        // Allow Enter key to submit
        ['loginEmail', 'loginPassword'].forEach(id => {
            document.getElementById(id)?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        });

        ['signupUsername', 'signupEmail', 'signupPassword'].forEach(id => {
            document.getElementById(id)?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSignup();
            });
        });

        document.getElementById('resetEmail')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleReset();
        });
    }

    showForm(formName) {
        // Hide all forms
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('resetForm').style.display = 'none';

        // Show selected form
        document.getElementById(`${formName}Form`).style.display = 'block';

        // Clear message
        this.hideMessage();
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showMessage('Please enter email and password', 'error');
            return;
        }

        this.showMessage('Logging in...', 'success');
        const result = await firebaseService.signIn(email, password);

        if (result.success) {
            this.isAuthenticated = true;
            this.showMessage('Login successful!', 'success');
            this.onAuthSuccess();
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    async handleSignup() {
        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (!username) {
            this.showMessage('Please enter a username', 'error');
            return;
        }

        if (!email) {
            this.showMessage('Please enter an email', 'error');
            return;
        }

        if (!password || password.length < 6) {
            this.showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        this.showMessage('Creating account...', 'success');
        const result = await firebaseService.signUp(email, password, username);

        if (result.success) {
            this.isAuthenticated = true;
            this.showMessage('Account created!', 'success');
            this.onAuthSuccess();
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    async handleReset() {
        const email = document.getElementById('resetEmail').value.trim();

        if (!email) {
            this.showMessage('Please enter your email', 'error');
            return;
        }

        this.showMessage('Sending reset email...', 'success');
        const result = await firebaseService.resetPassword(email);

        if (result.success) {
            this.showMessage('Password reset email sent! Check your inbox.', 'success');
            setTimeout(() => {
                this.showForm('login');
            }, 3000);
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    showMessage(text, type = 'success') {
        const messageEl = document.getElementById('authMessage');
        messageEl.textContent = text;
        messageEl.className = `auth-message show ${type}`;
    }

    hideMessage() {
        const messageEl = document.getElementById('authMessage');
        messageEl.className = 'auth-message';
    }

    onAuthSuccess() {
        // Hide auth screen, show game
        setTimeout(() => {
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('gameScreen').style.display = 'block';
            
            // Trigger app start
            if (window.onAuthComplete) {
                window.onAuthComplete();
            }
        }, 1000);
    }

    showAuthScreen() {
        const authScreen = document.getElementById('authScreen');
        const gameScreen = document.getElementById('gameScreen');
        if (authScreen) authScreen.style.display = 'flex';
        if (gameScreen) gameScreen.style.display = 'none';
    }

    showGameScreen() {
        const authScreen = document.getElementById('authScreen');
        const gameScreen = document.getElementById('gameScreen');
        if (authScreen) authScreen.style.display = 'none';
        if (gameScreen) gameScreen.style.display = 'block';
    }
}

export const auth = new Auth();
