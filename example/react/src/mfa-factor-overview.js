import React, { useState } from 'react';
import { Key, Shield, Smartphone, X, Plus, ChevronRight, Loader2 } from 'lucide-react';


const styles = {
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 50
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    maxWidth: '28rem',
    width: '100%',
    position: 'relative'
  },
  closeButton: {
    position: 'absolute',
    right: '1rem',
    top: '1rem',
    color: '#6B7280',
    cursor: 'pointer',
    padding: '0.25rem',
    border: 'none',
    background: 'none'
  },
  cardContainer: {
    border: '1px solid #E5E7EB',
    borderRadius: '0.5rem',
    padding: '1rem'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.5rem'
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  iconContainer: {
    color: '#2563EB'
  },
  deleteButton: {
    color: '#DC2626',
    cursor: 'pointer',
    padding: '0.25rem',
    border: 'none',
    background: 'none'
  },
  enrollButton: {
    color: '#2563EB',
    background: 'none',
    border: 'none',
    padding: '0.25rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  pageContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem'
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#2563EB',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer'
  },
  grid: {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '1rem'
  },
  section: {
    marginBottom: '2rem'
  },
  modalHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB'
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem'
  },
  modalDescription: {
    color: '#6B7280'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.25rem'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #E5E7EB',
    borderRadius: '0.375rem'
  },
  button: {
    width: '100%',
    padding: '0.5rem',
    backgroundColor: '#2563EB',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  optionButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    border: '1px solid #E5E7EB',
    borderRadius: '0.5rem',
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: '0.75rem'
  },
  optionContent: {
    flex: 1
  },
  optionTitle: {
    fontWeight: '500'
  },
  optionDescription: {
    color: '#6B7280',
    fontSize: '0.875rem'
  },
  error: {
    color: '#DC2626',
    fontSize: '0.875rem',
    marginTop: '0.5rem'
  },
  verified: {
    color: '#059669',
    fontSize: '0.875rem'
  },
  unverified: {
    color: '#D97706',
    fontSize: '0.875rem'
  },
  metaData: {
    color: '#6B7280',
    fontSize: '0.875rem'
  }
};


const Modal = ({ open, onClose, children }) => {
  if (!open) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <button style={styles.closeButton} onClick={onClose}>
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
};

const FactorCard = ({ factor, onDelete, onEnroll }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getIcon = (type) => {
    switch (type) {
      case 'totp': return <Key size={20} />;
      case 'phone': return <Smartphone size={20} />;
      case 'webauthn': return <Shield size={20} />;
      default: return <Key size={20} />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div style={styles.cardContainer}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>
          <div style={styles.iconContainer}>
            {getIcon(factor.factor_type)}
          </div>
          <div>
            <h3 style={styles.heading}>
              {factor.friendly_name || factor.factor_type.toUpperCase()}
            </h3>
            <span style={factor.status === 'verified' ? styles.verified : styles.unverified}>
              {factor.status === 'verified' ? 'Verified' : 'Unverified'}
            </span>
          </div>
        </div>

        {factor.status === 'verified' ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={styles.deleteButton}
          >
            <X size={16} />
          </button>
        ) : (
          <button
            onClick={() => onEnroll(factor)}
            style={styles.enrollButton}
          >
            Complete Setup
          </button>
        )}
      </div>

      <div style={styles.metaData}>
        <p>ID: {factor.id}</p>
        <p>Created: {formatDate(factor.created_at)}</p>
        <p>Last updated: {formatDate(factor.updated_at)}</p>
      </div>

      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Remove this factor?</h3>
          <p style={styles.modalDescription}>
            This action cannot be undone. This will permanently remove this authentication factor.
          </p>
        </div>
        <div style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            style={{ ...styles.button, backgroundColor: '#9CA3AF' }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onDelete(factor);
              setShowDeleteConfirm(false);
            }}
            style={{ ...styles.button, backgroundColor: '#DC2626' }}
          >
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
};

const AddFactorDialog = ({ open, onClose, onFactorAdded }) => {
  const [step, setStep] = useState('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [factorData, setFactorData] = useState({
    friendlyName: '',
    phoneNumber: '',
    totpSecret: '',
    qrCodeUrl: '',
  });

  const resetState = () => {
    setStep('select');
    setLoading(false);
    setError(null);
    setFactorData({
      friendlyName: '',
      phoneNumber: '',
      totpSecret: '',
      qrCodeUrl: '',
    });
  };

  const factorOptions = [
    {
      type: 'webauthn',
      title: 'Security Key or Biometric',
      description: 'Use a hardware security key, fingerprint, or face recognition',
      icon: <Shield size={24} />,
    },
    {
      type: 'totp',
      title: 'Authenticator App',
      description: 'Use an app like Google Authenticator or Authy',
      icon: <Key size={24} />,
    },
    {
      type: 'phone',
      title: 'SMS/Phone',
      description: 'Receive codes via text message',
      icon: <Smartphone size={24} />,
    },
  ];

  const handleFactorSelect = async (factorType) => {
    setLoading(true);
    setError(null);
    try {
      switch (factorType) {
        case 'webauthn': setStep('setup-webauthn'); break;
        case 'totp': setStep('setup-totp'); break;
        case 'phone': setStep('setup-phone'); break;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'select':
        return (
          <div style={{ padding: '1.5rem' }}>
            <h2 style={styles.modalTitle}>Add New Authentication Factor</h2>
            <p style={styles.modalDescription}>Choose a method to help secure your account</p>
            <div>
              {factorOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => handleFactorSelect(option.type)}
                  style={styles.optionButton}
                  disabled={loading}
                >
                  <div style={styles.iconContainer}>{option.icon}</div>
                  <div style={styles.optionContent}>
                    <h3 style={styles.optionTitle}>{option.title}</h3>
                    <p style={styles.optionDescription}>{option.description}</p>
                  </div>
                  <ChevronRight size={20} style={{ color: '#9CA3AF' }} />
                </button>
              ))}
            </div>
          </div>
        );

      case 'setup-webauthn':
        return (
          <div style={{ padding: '1.5rem' }}>
            <h2 style={styles.modalTitle}>Set Up Security Key</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Friendly Name (Optional)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="e.g., Work Laptop TouchID"
                value={factorData.friendlyName}
                onChange={(e) => setFactorData(prev => ({
                  ...prev,
                  friendlyName: e.target.value
                }))}
              />
            </div>
            <button
              onClick={() => handleFactorSelect('webauthn')}
              style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Waiting for security key...
                </>
              ) : (
                'Register Security Key'
              )}
            </button>
          </div>
        );

      case 'setup-totp':
        return (
          <div style={{ padding: '1.5rem' }}>
            <h2 style={styles.modalTitle}>Set Up Authenticator App</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Friendly Name (Optional)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="e.g., Google Authenticator"
                value={factorData.friendlyName}
                onChange={(e) => setFactorData(prev => ({ ...prev, friendlyName: e.target.value }))}
              />
            </div>
            <div style={{ ...styles.formGroup, textAlign: 'center', padding: '1rem', backgroundColor: '#F3F4F6' }}>
              [QR Code Placeholder]
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
                Secret: {factorData.totpSecret || 'XXXX XXXX XXXX XXXX'}
              </p>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Verification Code</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>
            <button style={styles.button}>Verify Code</button>
          </div>
        );

      case 'setup-phone':
        return (
          <div style={{ padding: '1.5rem' }}>
            <h2 style={styles.modalTitle}>Set Up Phone Authentication</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Friendly Name (Optional)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="e.g., Personal Phone"
                value={factorData.friendlyName}
                onChange={(e) => setFactorData(prev => ({ ...prev, friendlyName: e.target.value }))}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="tel"
                style={styles.input}
                placeholder="+1 (555) 555-5555"
                value={factorData.phoneNumber}
                onChange={(e) => setFactorData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              />
            </div>
            <button
              style={!factorData.phoneNumber || loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
              disabled={!factorData.phoneNumber || loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending Code...
                </>
              ) : (
                'Send Verification Code'
              )}
            </button>
          </div>
        );
    }
  };

  return (
    <Modal open={open} onClose={() => { resetState(); onClose(); }}>
      {renderStep()}
      {error && <div style={styles.error}>{error}</div>}
      {step !== 'select' && (
        <div style={{ padding: '1rem', borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
          <button
            onClick={() => setStep('select')}
            style={{ ...styles.button, backgroundColor: '#6B7280' }}
            disabled={loading}
          >
            Back
          </button>
        </div>
      )}
    </Modal>
  );
};

const MFAFactorsPage = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [factorsList, setFactorsList] = useState({
    data: {
      all: [
        {
          id: "1",
          friendly_name: "iPhone Face ID",
          factor_type: "webauthn",
          status: "verified",
          created_at: "2024-01-01",
          updated_at: "2024-01-01"
        },
        {
          id: "2",
          friendly_name: "Google Authenticator",
          factor_type: "totp",
          status: "verified",
          created_at: "2024-01-02",
          updated_at: "2024-01-02"
        }
      ],
      totp: [
        {
          id: "2",
          friendly_name: "Google Authenticator",
          factor_type: "totp",
          status: "verified",
          created_at: "2024-01-02",
          updated_at: "2024-01-02"
        }
      ],
      phone: []
    },
    error: null
  });

  const handleDelete = async (factor) => {
    console.log('Deleting factor:', factor);
  };

  const handleEnroll = async (factor) => {
    console.log('Enrolling factor:', factor);
  };

  const handleFactorAdded = async () => {
    console.log('Factor added');
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.pageHeader}>
        <h2 style={styles.title}>Multi-Factor Authentication</h2>
        <button
          onClick={() => setShowAddDialog(true)}
          style={styles.addButton}
        >
          <Plus size={16} />
          Add New Factor
        </button>
      </div>

      {factorsList.error ? (
        <div style={styles.error}>
          Error loading factors: {factorsList.error.message}
        </div>
      ) : (
        ['webauthn', 'totp', 'phone'].map((type) => {
          const factors = type === 'webauthn'
            ? factorsList.data.all.filter(f => f.factor_type === 'webauthn')
            : factorsList.data[type];

          return (
            <div key={type} style={styles.section}>
              <h3 style={styles.sectionTitle}>
                {type === 'webauthn' ? 'Security Keys (WebAuthn)' :
                 type === 'totp' ? 'Authenticator Apps (TOTP)' :
                 'Phone Numbers'}
              </h3>
              {factors.length === 0 ? (
                <p style={{ color: '#6B7280' }}>No factors added yet</p>
              ) : (
                <div style={styles.grid}>
                  {factors.map((factor) => (
                    <FactorCard
                      key={factor.id}
                      factor={factor}
                      onDelete={handleDelete}
                      onEnroll={handleEnroll}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <AddFactorDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onFactorAdded={handleFactorAdded}
      />
    </div>
  );
};

export default MFAFactorsPage;
