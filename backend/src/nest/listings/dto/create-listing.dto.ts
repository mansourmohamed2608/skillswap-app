import { IsNotEmpty, IsObject, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

/**
 * Validates key scalar fields inside the listing payload without stripping
 * the full object (which contains many optional fields the service handles).
 */
@ValidatorConstraint({ name: 'isValidListingPayload', async: false })
class IsValidListingPayloadConstraint implements ValidatorConstraintInterface {
  validate(listing: any, _args: ValidationArguments) {
    if (!listing || typeof listing !== 'object') return false;
    const title = listing.title ?? listing.offeredServiceTitle ?? listing.offeredService?.title;
    if (title !== undefined && (typeof title !== 'string' || title.length > 200)) return false;
    const desc = listing.description ?? listing.offeredServiceDescription ?? listing.offeredService?.description;
    if (desc !== undefined && (typeof desc !== 'string' || desc.length > 4000)) return false;
    const category = listing.category ?? listing.offeredService?.category;
    if (category !== undefined && (typeof category !== 'string' || category.length > 100)) return false;
    return true;
  }
  defaultMessage(_args: ValidationArguments) {
    return 'listing contains invalid field values (check title, description, category lengths)';
  }
}

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
  @Validate(IsValidListingPayloadConstraint)
  listing!: Record<string, unknown>;
}
