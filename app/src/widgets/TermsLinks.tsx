import React, { useState } from 'react';
import TermsModal from './TermsModal';

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
        className="bg-transparent border-none text-text-muted no-underline cursor-pointer text-[0.8rem] p-0 font-inherit transition-colors duration-200 hover:text-primary hover:underline"
        onClick={() => openTermsModal('terms')}
      >
        이용약관
      </button>
      {' · '}
      <button 
        type="button"
        className="bg-transparent border-none text-text-muted no-underline cursor-pointer text-[0.8rem] p-0 font-inherit transition-colors duration-200 hover:text-primary hover:underline"
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
