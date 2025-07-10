import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceControl({ onCommand }) {
  const { currentLanguage, setCurrentLanguage } = useAppContext();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // <-- NEW
  const recognitionRef = useRef(null);

  // Setup speech recognition and update language when changed
  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentLanguage;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.trim();
      if (text) onCommand(text);
    };
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, [currentLanguage, onCommand]);

  // Pause voice recognition when TTS is speaking, and track speaking state
  useEffect(() => {
    const synth = window.speechSynthesis;
    const handleStart = () => setIsSpeaking(true);
    const handleEnd = () => setIsSpeaking(false);

    synth.addEventListener('start', handleStart);
    synth.addEventListener('end', handleEnd);
    return () => {
      synth.removeEventListener('start', handleStart);
      synth.removeEventListener('end', handleEnd);
    };
  }, []);

  // Start/stop listening
  const toggleListening = (e) => {
    e.stopPropagation();
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      rec.stop();
    } else {
      rec.lang = currentLanguage;
      rec.start();
    }
  };

  // Language change: update context and recognition
  const handleLanguageChange = (e) => {
    setCurrentLanguage(e.target.value);
    if (recognitionRef.current) {
      recognitionRef.current.lang = e.target.value;
    }
  };

  return (
    <div className="vad-content">
      <div className="voice-status">
        <span className="status-icon">{isListening ? '🔊' : '🔇'}</span>
        <span className="status-text">
          {isListening
            ? (currentLanguage.startsWith('es') ? 'Escuchando...' : 'Listening...')
            : (currentLanguage.startsWith('es') ? 'Inactivo' : 'Inactive')}
        </span>
      </div>
      <button
        className={`voice-button click-to-speak${isListening ? ' listening' : ''}`}
        onClick={toggleListening}
        onTouchStart={toggleListening}
        aria-label={isListening
          ? (currentLanguage.startsWith('es') ? 'Detener' : 'Stop')
          : (currentLanguage.startsWith('es') ? 'Hablar' : 'Speak')}
        disabled={isSpeaking} // <-- DISABLE while speaking
        style={isSpeaking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
      >
        {isSpeaking
          ? (currentLanguage.startsWith('es') ? 'Hablando...' : 'Speaking...')
          : isListening
            ? (currentLanguage.startsWith('es') ? 'Detener' : 'Stop')
            : (currentLanguage.startsWith('es') ? 'Hablar' : 'Speak')}
      </button>
      <div className="language-section">
        <label htmlFor="vad-lang">
          {currentLanguage.startsWith('es') ? 'Idioma:' : 'Language:'}
        </label>
        <select
          id="vad-lang"
          name="language"
          value={currentLanguage}
          onChange={handleLanguageChange}
          className="language-selector"
        >
          <option value="en-US">English</option>
          <option value="es-ES">Español</option>
        </select>
      </div>
    </div>
  );
}
