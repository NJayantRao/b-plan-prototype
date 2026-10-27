class ApiResponse<T = undefined> {
  readonly statusCode: number;
  readonly success: boolean;
  readonly message: string;
  readonly data: T | undefined;

  constructor(statusCode: number, message: string, data?: T) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }
}

export default ApiResponse;
