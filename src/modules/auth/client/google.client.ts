import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

@Injectable()
export class GoogleClient {
  constructor(private readonly configService: ConfigService) {}

  async getToken(code: string): Promise<string> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const { data } = await axios.post(tokenUrl, {
      code,
      client_id: this.configService.get('GOOGLE_CLIENT_ID'),
      client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
      redirect_uri: `${this.configService.get('API_URL')}/auth/google/callback`,
      grant_type: 'authorization_code',
    });

    return data.access_token;
  }

  async getUserInfo(accessToken: string) {
    const { data } = await axios.get<GoogleUserInfo>(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    return {
      socialId: data.id,
      email: data.email,
      name: data.name,
      provider: 'google' as const,
    };
  }
}
