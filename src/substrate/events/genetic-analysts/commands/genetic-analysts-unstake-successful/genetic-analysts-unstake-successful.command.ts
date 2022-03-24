import { GeneticAnalystsModel } from '../../../../models/genetic-analysts/genetic-analysts.model';
import { BlockMetaData } from '../../../../models/blockMetaData';

export class GeneticAnalystUnstakeSuccessfulCommand {
  public geneticAnalystsModel: GeneticAnalystsModel;
  constructor(data: Array<any>, public readonly blockMetaData: BlockMetaData) {
    this.geneticAnalystsModel = new GeneticAnalystsModel(data[0].toHuman());
  }
}