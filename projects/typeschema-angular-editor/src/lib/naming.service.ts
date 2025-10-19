import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NamingService {

  /**
   * Generates a name hash for a random payload based on sha1
   */
  public async hash(data: string): Promise<string> {
    const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(data));

    let hash = Array.from(new Uint8Array(buffer))
      .map((bytes) => bytes.toString(16).padStart(2, '0'))
      .join('');

    for (let i = 0; i < 10; i++) {
      const char = '' + i;
      hash = hash.replaceAll(char, String.fromCharCode(103 + i));
    }

    return hash.substring(0, 12);
  }

}
