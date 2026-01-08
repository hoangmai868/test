import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { userName, password } = loginDto;

    // Find user by userName
    const user = await this.prisma.user.findUnique({
      where: { userName },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // For now, compare plain text password
    // In production, you should use bcrypt to hash and compare passwords
    if (user.password !== password) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return {
      success: true,
      user: {
        id: user.id,
        userName: user.userName || '',
      },
    };
  }
}




