/* Generated by: JJTree: Do not edit this line. Name.java Version 1.1 */
/* ParserGeneratorCCOptions:MULTI=true,NODE_USES_PARSER=false,VISITOR=true,TRACK_TOKENS=true,NODE_PREFIX=,NODE_EXTENDS=,NODE_FACTORY=,SUPPORT_CLASS_VISIBILITY_PUBLIC=true */
package com.arcadedb.graphql.parser;

public class Name extends SimpleNode {
  String value;

  public Name(int id) {
    super(id);
  }

  public Name(GraphQLParser p, int id) {
    super(p, id);
  }

  /**
   * Accept the visitor.
   **/
  public Object jjtAccept(GraphQLParserVisitor visitor, Object data) {
    return visitor.visit(this, data);
  }

  @Override
  public String toString() {
    return "Name{" + value + '}';
  }
}
/* ParserGeneratorCC - OriginalChecksum=bd50e2b87b7256145dfaab2aee30f3e9 (do not edit this line) */