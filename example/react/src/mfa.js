import React, { useState } from 'react';

const MFAPage = ({ onSuccess, onCancel, auth }) => {
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle input change for each digit
  const handleInputChange = (index, value) => {
    if (!/^[0-9]*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`mfa-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle keydown for backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`mfa-input-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newCode = [...verificationCode];
        newCode[index - 1] = '';
        setVerificationCode(newCode);
      }
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);
    setError('');

    try {
      const code = verificationCode.join('');
        // Enroll, Challenge, and Verify

      nSuccess?.();
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      // TODO: Replace with Challenge
      alert('New code sent successfully');
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-center text-2xl font-semibold text-gray-900">
              Two-Factor Authentication
            </h2>
          </div>

          <div className="px-6 py-6">
            <p className="text-sm text-gray-600 text-center mb-6">
              Enter the verification code sent to your device
            </p>

            <div className="flex justify-center space-x-2 mb-6">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  id={`mfa-input-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ))}
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center mb-4">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleVerify}
                disabled={isLoading || verificationCode.some(digit => !digit)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>

              <button
                onClick={onCancel}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={handleResendCode}
              className="w-full text-sm text-blue-600 hover:text-blue-500 text-center"
            >
              Didn't receive a code? Resend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MFAPage;
