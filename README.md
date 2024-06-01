# 🤝나만의 채용 서비스 백엔드 서버 만들기_해석본
- first commit : 필수 구현 
  - 회원가입
  - 로그인
  - AccessToken 인증 미들웨어
  - 내 정보 조회
  - 이력서 생성
  - 이력서 목록 조회, 상세 조회
  - 이력서 수정, 삭제

- second commit : 선택 구현
  - 역할에 따른 실행 결과 분기
    - 이력서 목록 조회 API 추가 구현
    - 이력서 상세 조회 API 추가 구현
  - Transaction 이용
    - 역할 인가 Middleware
    - 이력서 지원상태 변경 API
    - 이력서 로그 목록 조회 API
  - RefreshToken 활용
    - 로그인 API에 기능 추가
    - RefreshToken 인증 Middleware
    - 토큰 재발급 API
    - 로그아웃 API    

# node-intermediate

# 환경변수

- `.env.example` 파일의 이름을 `.env`로 변경하고 아래 내용을 채움

```sh
SERVER_PORT=서버 포트
DATABASE_URL=mysql://계정이름:비밀번호@주소:포트/DB명
ACCESS_TOKEN_SECRET=JWT 생성을 위한 비밀키
REFRESH_TOKEN_SECRET=JWT 생성을 위한 비밀키
```

# 실행 방법

- 필요한 패키지 설치

```sh
yarn
```

- 서버 실행 (배포용)

```sh
yarn start
```

- 서버 실행 (개발용)

```sh
yarn dev
```

# API 명세서

https://modolee.notion.site/08dfa1c84e594f188a08934967fcbd39

# ERD

https://drawsql.app/teams/team-modolee/diagrams/sparta-node-intermediate-2
