import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  timestampUtc: string;
}

export class ResponseFactory {
  public static success<T>(data: T, message = 'Success', status = 200): NextResponse {
    return NextResponse.json({
      success: true,
      code: 'SUCCESS',
      message,
      data,
      timestampUtc: new Date().toISOString(),
    }, { status });
  }

  public static error(message: string, code = 'INTERNAL_ERROR', status = 500, errors?: Record<string, string[]>): NextResponse {
    return NextResponse.json({
      success: false,
      code,
      message,
      errors,
      timestampUtc: new Date().toISOString(),
    }, { status });
  }
}
