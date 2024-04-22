/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto, executePagination } from 'src/common';
import { RpcException } from '@nestjs/microservices';
import { PaginationResultsProps } from 'src/common/dto';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService');

  onModuleInit() {
    this.$connect();
    this.logger.log('📚 Database connected');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  findAll = async (paginationDto: PaginationDto) => {
    const { page, limit, sort } = paginationDto;

    try {
      const docs: number = await this.product.count();

      const skipValue = (page - 1) * limit;

      const qrs = await this.product.findMany({
        take: limit,
        skip: skipValue,
        orderBy: { createdAt: sort },
      });

      const paginationResults: PaginationResultsProps = executePagination({
        page,
        limit,
        sort,
        endpointName: 'products',
        docs,
        items: qrs,
      });

      return paginationResults;
    } catch (err) {
      if (err instanceof RpcException) throw err;

      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Something went wrong.',
      });
    }
  };

  findOne = async (id: number) => {
    try {
      const product = await this.product.findUnique({
        where: { id: id, isAvailable: true },
      });

      if (!product) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `QR not found or has been deleted.`,
          payload: [{ id }],
        });
      }

      return { status: 'success', payload: [product] };
    } catch (err) {
      if (err instanceof RpcException) throw err;

      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Something went wrong.',
      });
    }
  };

  update = async (id: number, updateProductDto: UpdateProductDto) => {
    const { id: __, ...data } = updateProductDto;
    try {
      await this.findOne(id);

      const payload = this.product.update({
        where: { id },
        data: data,
      });

      return { status: 'success', payload: [payload] };
    } catch (err) {
      if (err instanceof RpcException) throw err;

      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Something went wrong.',
      });
    }
  };

  remove = async (id: number) => {
    try {
      await this.findOne(id);

      const payload = await this.product.update({
        where: { id },
        data: { isAvailable: false },
      });

      return { status: 'success', payload: [payload] };
    } catch (err) {
      if (err instanceof RpcException) throw err;

      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Something went wrong.',
      });
    }
  };

  validateProducts = async (ids: number[]) => {
    ids = Array.from(new Set(ids));

    try {
      const products = await this.product.findMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      if (products.length !== ids.length) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: `Some products are not available`,
        });
      }

      return { status: 'success', payload: [products] };
    } catch (err) {
      if (err instanceof RpcException) throw err;

      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Something went wrong.',
      });
    }
  };
}
