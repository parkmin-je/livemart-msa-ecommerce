// Daum/Kakao 우편번호 서비스 타입 선언
// https://postcode.map.daum.net/guide

interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName?: string;
  apartment?: string;
}

interface DaumPostcodeOptions {
  oncomplete: (data: DaumPostcodeData) => void;
  width?: string | number;
  height?: string | number;
}

interface DaumPostcode {
  embed(container: HTMLElement, options?: { q?: string }): void;
  open(options?: { q?: string }): void;
}

interface DaumPostcodeConstructor {
  new (options: DaumPostcodeOptions): DaumPostcode;
}

interface Window {
  daum?: {
    Postcode: DaumPostcodeConstructor;
  };
}
