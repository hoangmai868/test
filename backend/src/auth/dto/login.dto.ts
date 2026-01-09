export class LoginDto {
  userName: string;
  password: string;
}

export class LoginResponseDto {
  success: boolean;
  user?: {
    id: string;
    userName: string;
  };
  accessToken?: string;
  message?: string;
}

export class ProfileResponseDto {
  success: boolean;
  user?: {
    id: string;
    userName: string;
  };
  message?: string;
}




