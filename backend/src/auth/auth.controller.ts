import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto, ProfileResponseDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    try {
      const result = await this.authService.login(loginDto);

      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      return {
        success: true,
        user: result.user,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return {
          success: false,
          message: error.message || 'Invalid username or password',
        };
      }
      throw error;
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any): Promise<ProfileResponseDto> {
    const user = await this.authService.validateUser(req.user.userId);
    return {
      success: true,
      user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}

