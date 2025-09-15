import { Test, TestingModule } from '@nestjs/testing';
import { PineconeController } from './pinecone.controller';

describe('PineconeController', () => {
  let controller: PineconeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PineconeController],
    }).compile();

    controller = module.get<PineconeController>(PineconeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
