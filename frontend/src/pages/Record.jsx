import { Link } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { transcribeAudio } from '../api';
import React, { useState, useRef } from "react";

export default function AudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const { user } = useAuth();

  const startRecording = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.");
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.onstop = async () => {
      setIsProcessing(true);
      setError("");
      
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const data = await transcribeAudio(audioBlob);
        
        const text =
          data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ||
          "No transcript available";
        setTranscript(text);
      } catch (err) {
        console.error("Error transcribing:", err);
        setError("Failed to transcribe audio. Please try again.");
        setTranscript("");
      } finally {
        setIsProcessing(false);
      }
    };

    setRecording(false);
  };

  if (!user) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-6">Audio Recorder</h1>
        <p className="text-gray-600 dark:text-gray-300">Please log in to use the audio recorder.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-12 transition-colors duration-300">
      {/* Navigation */}
      <div className="mb-6">
        <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200">&larr; Back to List</Link>
        <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
        <Link to="/timeline" className="text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200">View Timeline</Link>
        <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
        <Link to="/people" className="text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200">View by People</Link>
        <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
        <Link to="/location" className="text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200">View by Location</Link>
        <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
        <Link to="/family-tree" className="text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200">Family Tree</Link>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-gray-100">🎤 Audio Recorder</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
            Record audio stories and get them automatically transcribed into text. Perfect for capturing family memories and stories.
          </p>

          {/* Recording Controls */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={startRecording}
              disabled={recording || isProcessing}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                recording || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 hover:scale-105'
              }`}
            >
              {recording ? '🔴 Recording...' : '🎤 Start Recording'}
            </button>
            
            <button
              onClick={stopRecording}
              disabled={!recording || isProcessing}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                !recording || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:scale-105'
              }`}
            >
              ⏹️ Stop Recording
            </button>
          </div>

          {/* Status Indicators */}
          {recording && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-2 rounded-full">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                Recording in progress...
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                Processing audio...
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Transcript:</h3>
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{transcript}</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">How to use:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Click "Start Recording" and allow microphone access when prompted</li>
              <li>Speak clearly into your microphone</li>
              <li>Click "Stop Recording" when you're finished</li>
              <li>Wait for the transcription to complete</li>
              <li>Copy the transcript text to use in your stories</li>
            </ol>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Tips for better transcription:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Speak clearly and at a moderate pace</li>
              <li>• Minimize background noise</li>
              <li>• Keep the microphone close to your mouth</li>
              <li>• Record in a quiet environment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}