import { ServiceName, Services } from '../types/agent.types';

export function serviceNameOf(service: Services): ServiceName {
  return service.api ? 'api' : 'web';
}
