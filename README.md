# K-Dramatic Girls · Planner 사용법

## 1. 폴더 위치

플래너만 따로 올리는 버전이에요. 저장소 맨 위에 이렇게 두면 돼요.

```
저장소/
├─ index.html
├─ style.css
├─ script.js
├─ config.js
├─ README.md
├─ logo.webp                       ← 선글라스 로고
├─ fonts/
│  ├─ BodoniModa-Variable.woff2
│  ├─ BodoniModa-VariableItalic.woff2
│  ├─ InstrumentSans-Variable.woff2
│  ├─ InstrumentSans-VariableItalic.woff2
│  ├─ PinyonScript.woff2
│  └─ Ranchers.woff2
└─ images/
   ├─ carpet1.webp                 ← 배경 카펫
   ├─ camera1.webp                 ← 대시보드 스티커
   ├─ diary4.webp                  ← 캘린더 스티커
   └─ crane1.webp                  ← 아이디어 스티커
```

웹사이트의 `fonts/`, `images/` 폴더를 통째로 복사해도 되지만, 플래너가 실제로 쓰는 건 위 파일들뿐이에요. 파일 이름(대소문자 포함)이 똑같아야 해요.

GitHub Pages로 올리면 `아이디.github.io/저장소이름/` 으로 바로 열려요. 검색엔진에는 안 뜨게 해뒀어요.

## 2. 바로 써보기 (설정 없음)

`planner/index.html`을 열면 바로 써요. 단, 이 상태에서는 **그 브라우저에만** 저장돼요. Cat과 Mandu가 같은 내용을 보려면 아래 3번을 해주세요.

## 3. 같이 쓰기 설정 (Firebase, 무료, 10분 정도)

### ① Firebase 프로젝트 만들기
1. https://console.firebase.google.com 에 구글 계정으로 들어가요.
2. **프로젝트 추가** → 이름 예: `kdramatic-planner` → Google 애널리틱스는 꺼도 돼요.

### ② 데이터베이스 만들기
1. 왼쪽 메뉴 **빌드 → Firestore Database → 데이터베이스 만들기**
2. 위치: 둘 다 유럽에 있으면 `europe-west3 (Frankfurt)`, 주로 한국이면 `asia-northeast3 (Seoul)`
3. **프로덕션 모드**로 시작

### ③ 팀 코드 정하고 규칙 붙여넣기
팀 코드는 둘만 아는 비밀번호 같은 거예요. 영문·숫자·`-`·`_` 로 **길게** 만들어요. 예: `kdg-cat-mandu-7f3k9q2x`

Firestore 화면의 **규칙** 탭에 아래를 통째로 붙여넣고, `여기에-팀코드` 를 정한 코드로 바꾼 뒤 **게시**를 눌러요.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /teams/여기에-팀코드/{document=**} {
      allow read, write: if true;
    }
  }
}
```

이렇게 하면 팀 코드를 아는 사람만 플래너 내용을 읽고 쓸 수 있어요.

### ④ 웹앱 등록하고 설정값 복사하기
1. 왼쪽 위 ⚙️ **프로젝트 설정 → 일반** → 아래쪽 **내 앱**에서 웹 아이콘 `</>` 클릭
2. 앱 닉네임 아무거나 → **앱 등록** (Firebase 호스팅은 체크 안 해도 돼요)
3. 화면에 나오는 `const firebaseConfig = { ... }` 의 **중괄호 안 내용**을 복사해요.
4. `planner/config.js` 의 `firebase: null` 을 이렇게 바꿔요.

```js
window.PLANNER_CONFIG = {
  firebase: {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
  }
};
```

`config.js`의 값은 원래 공개돼도 괜찮은 값이에요. 실제로 지켜주는 건 ③의 규칙과 팀 코드예요.

### ⑤ 플래너에서 연결하기
플래너 → **Settings → Sharing** → 팀 코드 입력 → **Connect**.
Cat과 Mandu 둘 다, 쓰는 기기(노트북, 폰)마다 한 번씩 입력하면 돼요. 오른쪽 위가 **Shared · Cat & Mandu** 로 바뀌면 성공이에요.

처음 연결할 때 공유 플래너가 비어 있으면, 이 기기에서 이미 적어둔 게 있을 경우 "올릴까요?"라고 물어봐요.

### 잘 안 될 때
- **"Couldn't connect"** 가 뜨면: `config.js` 붙여넣기, 규칙의 팀 코드와 입력한 팀 코드가 똑같은지, 규칙을 **게시**했는지 확인해요.
- 파일을 더블클릭해서 열었을 때만 안 되면, 웹사이트와 함께 인터넷에 올려서 주소로 열어보세요.
- 이 플래너는 진짜 Firebase에는 연결해보지 못하고, Firebase와 똑같이 동작하는 테스트용 서버로만 확인했어요. 문제가 생기면 화면에 뜬 메시지를 알려주세요.

## 4. 백업
**Settings → Backup** 에서 플래너 전체를 파일 하나로 내려받거나, 그 파일로 되돌릴 수 있어요. 혼자 쓰다가 공유로 옮길 때도 이걸 쓰면 돼요.

## 5. 고치고 싶을 때
- 에피소드 상태 이름, 바로가기 링크 종류, 이모티콘 목록: `script.js` 맨 위 `STATUSES`, `LINKS`, `EMOJIS`
- 한글 글꼴: 지금은 **고운바탕 굵게(Gowun Batang Bold)**. 보통 굵기가 작은 글씨에서 흐릿해서 굵은 것만 불러와요(`index.html`의 구글 폰트 주소 `wght@700`). 다른 글꼴로 바꾸려면 그 주소와 `style.css`의 `--ko` 줄에서 이름만 바꿔요. 예: `Noto Serif KR`, `Hahmlet`, `Nanum Myeongjo`
- 처음 들어 있는 할 일·에피소드는 플래너가 **비어 있을 때 한 번만** 들어가요. 이후엔 화면에서 고치면 돼요.
