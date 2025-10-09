import React, { useState } from 'react';
import TermsModal from './TermsModal';
import './TermsLinks.css';

const TermsLinks: React.FC = () => {
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [termsType, setTermsType] = useState<'terms' | 'privacy'>('terms');

  const openTermsModal = (type: 'terms' | 'privacy') => {
    setTermsType(type);
    setShowTermsModal(true);
  };

  return (
    <>
      <button 
        type="button"
        className="terms-link"
        onClick={() => openTermsModal('terms')}
      >
        이용약관
      </button>
      {' · '}
      <button 
        type="button"
        className="terms-link"
        onClick={() => openTermsModal('privacy')}
      >
        개인정보처리방침
      </button>
      <TermsModal 
        isOpen={showTermsModal}
        termsType={termsType}
        onClose={() => setShowTermsModal(false)}
      />
    </>
  );
};

export default TermsLinks;

