/* Generated by: JJTree: Do not edit this line. OperationType.java Version 1.1 */
/* ParserGeneratorCCOptions:MULTI=true,NODE_USES_PARSER=false,VISITOR=true,TRACK_TOKENS=true,NODE_PREFIX=,NODE_EXTENDS=,NODE_FACTORY=,SUPPORT_CLASS_VISIBILITY_PUBLIC=true */
package com.arcadedb.graphql.parser;

public class OperationType extends SimpleNode {

  protected boolean mutation = false;
  protected boolean query    = false;

  public OperationType(int id) {
    super(id);
  }

  public OperationType(GraphQLParser p, int id) {
    super(p, id);
  }

  /**
   * Accept the visitor.
   **/
  public Object jjtAccept(GraphQLParserVisitor visitor, Object data) {
    return visitor.visit(this, data);
  }

  public boolean isQuery() {
    return query;
  }
}
/* ParserGeneratorCC - OriginalChecksum=68467c458edb7fe5b5133928f474d3d5 (do not edit this line) */