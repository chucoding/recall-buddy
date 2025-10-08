import React from 'react';
import { useNavigationStore } from '../stores/navigationStore';

const NoDataView: React.FC = () => {
  const { navigateToSettings } = useNavigationStore();
  return (
    <div style={{
      display: "flex", 
      flexDirection: "column",
      height: "100vh", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
      color: "white",
      textAlign: "center",
      padding: "16px"
    }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "24px",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        maxWidth: "400px",
        width: "100%"
      }}>
        <img 
          src="/nodata.png" 
          alt="데이터 없음" 
          style={{
            width: "140px",
            height: "auto",
            marginBottom: "16px",
            filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))"
          }}
        />
        <h2 style={{
          fontSize: "20px",
          marginBottom: "8px",
          fontWeight: "600",
          lineHeight: "1.3"
        }}>
          📭 플래시카드가 없습니다
        </h2>
        <p style={{
          fontSize: "14px",
          marginBottom: "6px",
          opacity: 0.9,
          lineHeight: "1.4"
        }}>
          최근 커밋에서 학습할 내용을 찾지 못했습니다
        </p>
        <p style={{
          fontSize: "12px",
          marginBottom: "24px",
          opacity: 0.7,
          lineHeight: "1.4"
        }}>
          ⚙️ 설정 에서 다른 리포지토리나 브랜치를 시도해보세요
        </p>
        
         <button
           onClick={() => {
             navigateToSettings();
           }}
           style={{
            background: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "10px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            margin: "0 auto"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          ⚙️ 설정으로 이동
        </button>
      </div>
    </div>
  );
};

export default NoDataView;
