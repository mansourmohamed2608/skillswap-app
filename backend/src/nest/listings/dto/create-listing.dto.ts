import { IsNotEmpty, IsObject } from 'class-validator';

/**
 * Body for POST /listings/create
 *
 * The listing payload is a deep object with many optional fields that the
 * service validates internally (assertListingQuality, bannedKeywords, etc.).
 * We enforce the outer shape here so the guard + ValidationPipe can reject
 * obviously malformed requests before they reach any business logic.
 */
export class CreateListingDto {
  @IsObject()
  @IsNotEmpty()
  listing!: Record<string, unknown>;
}
