import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get('summary')
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  getSummary() {
    return this.expenseService.getSummary();
  }

  @Get('categories')
  getCategories() {
    return this.expenseService.getCategories();
  }

  @Post('categories')
  @Roles('SUPER_ADMIN', 'PG_ADMIN')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.expenseService.createCategory(createCategoryDto);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'PG_ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('receipt'))
  create(
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.expenseService.create(createExpenseDto, user.sub, file);
  }

  @Get()
  findAll(@Query() filterDto: ExpenseFilterDto) {
    return this.expenseService.findAll(filterDto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'PG_ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expenseService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'PG_ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.expenseService.softDelete(id);
  }
}
