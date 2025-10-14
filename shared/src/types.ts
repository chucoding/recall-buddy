/**
 * GitHub Repository
 * 
 * id: 리포지토리 고유 아이디
 * name: 리포지토리 이름
 * full_name: 리포지토리 전체 이름
 * description: 리포지토리 설명
 * html_url: 리포지토리 홈페이지 주소
 * private: 리포지토리 공개 여부
 */
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
}

