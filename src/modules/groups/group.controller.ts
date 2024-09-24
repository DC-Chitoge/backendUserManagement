import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { UpdateGroupDto } from './dtos/updateGroupDto';
import { CreateGroupDto } from './dtos/createGroupDto';
import { AuthGuard } from 'src/guards/auth.guard';
import { RoleGuard } from 'src/guards/role.guard';
import { HttpExceptionFilter } from 'src/exceptions/http-exception.filter';
import { ApiTags } from '@nestjs/swagger';
@Controller('groups')
@UseGuards(AuthGuard, new RoleGuard(['rootadmin']))
@UseFilters(HttpExceptionFilter)
@ApiTags('Groups route')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupService.create(createGroupDto);
  }

  @Get()
  findAll() {
    return this.groupService.findAll();
  }

  @Get(':groupId')
  findOne(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupService.findOne(groupId);
  }
  @Post('findByName')
  findByName(@Body('groupName') groupName: string) {
    return this.groupService.findByName(groupName);
  }

  @Patch(':groupId')
  update(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupService.update(groupId, updateGroupDto);
  }

  @Delete(':groupId')
  remove(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupService.remove(groupId);
  }
}
