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
  message?: string;
}




