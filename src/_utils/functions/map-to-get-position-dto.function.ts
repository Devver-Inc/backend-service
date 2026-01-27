import { GetPositionDto } from '../dtos/responses/get-position.dto';
import { Position } from '../schemas/position.schema';

export const mapToGetPositionDto = (position: Position): GetPositionDto => ({
  pageUrl: position.pageUrl,
  anchor: position.anchor,
  normX: position.normX,
  normY: position.normY,
  anchorOffsetX: position.anchorOffsetX,
  anchorOffsetY: position.anchorOffsetY,
});
