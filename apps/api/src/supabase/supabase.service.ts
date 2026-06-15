import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly url = process.env.SUPABASE_URL!;
  private readonly anonKey = process.env.SUPABASE_ANON_KEY!;

  getClient(accessToken?: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    });
  }

  getServiceClient(): SupabaseClient {
    return createClient(this.url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
}
