// using Microsoft.CodeAnalysis;
// using Microsoft.CodeAnalysis.CSharp;
// using Microsoft.CodeAnalysis.CSharp.Syntax;
//
// namespace KoalaWiki.CodeMap.Language;
//
// public class ParseCSharp
// {
//     /// <summary>
//     /// 使用Roslyn解析C#代码
//     /// </summary>
//     public static async Task<List<CodeSegment>> ParseCSharpCodeWithRoslynAsync(string code, string filePath)
//     {
//         var segments = new List<CodeSegment>();
//
//         try
//         {
//             // 创建语法树
//             SyntaxTree syntaxTree = CSharpSyntaxTree.ParseText(code, path: filePath);
//             var root = await syntaxTree.GetRootAsync();
//             var compilation = CSharpCompilation.Create("CodeAnalysis")
//                 .AddReferences(MetadataReference.CreateFromFile(typeof(object).Assembly.Location))
//                 .AddSyntaxTrees(syntaxTree);
//             var semanticModel = compilation.GetSemanticModel(syntaxTree);
//
//             // 提取命名空间
//             var namespaces = root.DescendantNodes().OfType<NamespaceDeclarationSyntax>();
//             foreach (var ns in namespaces)
//             {
//                 // 获取行号信息
//                 var lineSpan = ns.GetLocation().GetLineSpan();
//                 int startLine = lineSpan.StartLinePosition.Line + 1;
//                 int endLine = lineSpan.EndLinePosition.Line + 1;
//
//                 segments.Add(new CodeSegment
//                 {
//                     Type = "Namespace",
//                     Name = ns.Name.ToString(),
//                     Code = ns.ToString(),
//                     StartLine = startLine,
//                     EndLine = endLine,
//                     Namespace = ns.Name.ToString()
//                 });
//
//                 // 不单独处理命名空间内的内容，因为会被类和方法处理
//             }
//
//             // 提取类定义
//             var classes = root.DescendantNodes().OfType<ClassDeclarationSyntax>();
//             foreach (var cls in classes)
//             {
//                 // 获取行号信息
//                 var lineSpan = cls.GetLocation().GetLineSpan();
//                 int startLine = lineSpan.StartLinePosition.Line + 1;
//                 int endLine = lineSpan.EndLinePosition.Line + 1;
//
//                 // 获取命名空间
//                 string? namespaceName = null;
//                 var parent = cls.Parent;
//                 while (parent != null)
//                 {
//                     if (parent is NamespaceDeclarationSyntax ns)
//                     {
//                         namespaceName = ns.Name.ToString();
//                         break;
//                     }
//
//                     parent = parent.Parent;
//                 }
//
//                 // 获取XML文档注释
//                 string documentation = GetXmlDocumentation(cls);
//
//                 // 获取基类和接口
//                 var dependencies = new List<string>();
//                 if (cls.BaseList != null)
//                 {
//                     foreach (var baseType in cls.BaseList.Types)
//                     {
//                         dependencies.Add(baseType.ToString());
//                     }
//                 }
//
//                 // 获取类修饰符
//                 string modifiers = string.Join(" ", cls.Modifiers);
//
//                 segments.Add(new CodeSegment
//                 {
//                     Type = $"Class {(cls.Modifiers.Any(m => m.IsKind(SyntaxKind.StaticKeyword)) ? "Static " : "")}",
//                     Name = cls.Identifier.ToString(),
//                     Code = cls.ToString(),
//                     StartLine = startLine,
//                     EndLine = endLine,
//                     Namespace = namespaceName ?? "",
//                     Documentation = documentation,
//                     Dependencies = dependencies,
//                     Modifiers = modifiers
//                 });
//             }
//
//             // 提取方法定义
//             var methods = root.DescendantNodes().OfType<MethodDeclarationSyntax>();
//             foreach (var method in methods)
//             {
//                 // 获取行号信息
//                 var lineSpan = method.GetLocation().GetLineSpan();
//                 int startLine = lineSpan.StartLinePosition.Line + 1;
//                 int endLine = lineSpan.EndLinePosition.Line + 1;
//
//                 // 获取类名和命名空间
//                 string? className = null;
//                 string? namespaceName = null;
//                 var parent = method.Parent;
//                 while (parent != null)
//                 {
//                     if (parent is ClassDeclarationSyntax cls)
//                     {
//                         className = cls.Identifier.ToString();
//                     }
//                     else if (parent is NamespaceDeclarationSyntax ns)
//                     {
//                         namespaceName = ns.Name.ToString();
//                         break;
//                     }
//
//                     parent = parent.Parent;
//                 }
//
//                 // 获取XML文档注释
//                 string documentation = GetXmlDocumentation(method);
//
//                 // 获取方法参数和返回类型
//                 string returnType = method.ReturnType.ToString();
//                 var parameters = method.ParameterList.Parameters
//                     .Select(p => $"{p.Type} {p.Identifier}");
//                 string paramList = string.Join(", ", parameters);
//
//                 // 获取方法修饰符
//                 string modifiers = string.Join(" ", method.Modifiers);
//
//                 // 分析方法依赖项
//                 var dependencies = new List<string>();
//                 var invocations = method.DescendantNodes().OfType<InvocationExpressionSyntax>();
//                 foreach (var invocation in invocations)
//                 {
//                     if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
//                     {
//                         dependencies.Add(memberAccess.Name.ToString());
//                     }
//                 }
//
//                 segments.Add(new CodeSegment
//                 {
//                     Type = $"Method {(method.Modifiers.Any(m => m.IsKind(SyntaxKind.StaticKeyword)) ? "Static " : "")}",
//                     Name = method.Identifier.ToString(),
//                     Code = method.ToString(),
//                     StartLine = startLine,
//                     EndLine = endLine,
//                     Namespace = namespaceName ?? "",
//                     ClassName = className ?? "",
//                     Documentation = documentation,
//                     ReturnType = returnType,
//                     Parameters = paramList,
//                     Dependencies = dependencies.Distinct().ToList(),
//                     Modifiers = modifiers
//                 });
//             }
//
//             // 提取属性定义
//             var properties = root.DescendantNodes().OfType<PropertyDeclarationSyntax>();
//             foreach (var property in properties)
//             {
//                 // 获取行号信息
//                 var lineSpan = property.GetLocation().GetLineSpan();
//                 int startLine = lineSpan.StartLinePosition.Line + 1;
//                 int endLine = lineSpan.EndLinePosition.Line + 1;
//
//                 // 获取类名
//                 string? className = null;
//                 var parent = property.Parent;
//                 while (parent != null)
//                 {
//                     if (parent is ClassDeclarationSyntax cls)
//                     {
//                         className = cls.Identifier.ToString();
//                         break;
//                     }
//
//                     parent = parent.Parent;
//                 }
//
//                 // 获取XML文档注释
//                 string documentation = GetXmlDocumentation(property);
//
//                 // 获取属性修饰符
//                 string modifiers = string.Join(" ", property.Modifiers);
//
//                 segments.Add(new CodeSegment
//                 {
//                     Type = "Property",
//                     Name = property.Identifier.ToString(),
//                     Code = property.ToString(),
//                     StartLine = startLine,
//                     EndLine = endLine,
//                     ClassName = className ?? "",
//                     Documentation = documentation,
//                     ReturnType = property.Type.ToString(),
//                     Modifiers = modifiers
//                 });
//             }
//
//             // 提取接口定义
//             var interfaces = root.DescendantNodes().OfType<InterfaceDeclarationSyntax>();
//             foreach (var iface in interfaces)
//             {
//                 // 获取行号信息
//                 var lineSpan = iface.GetLocation().GetLineSpan();
//                 int startLine = lineSpan.StartLinePosition.Line + 1;
//                 int endLine = lineSpan.EndLinePosition.Line + 1;
//
//                 // 获取命名空间
//                 string? namespaceName = null;
//                 var parent = iface.Parent;
//                 while (parent != null)
//                 {
//                     if (parent is NamespaceDeclarationSyntax ns)
//                     {
//                         namespaceName = ns.Name.ToString();
//                         break;
//                     }
//
//                     parent = parent.Parent;
//                 }
//
//                 // 获取XML文档注释
//                 string documentation = GetXmlDocumentation(iface);
//
//                 segments.Add(new CodeSegment
//                 {
//                     Type = "Interface",
//                     Name = iface.Identifier.ToString(),
//                     Code = iface.ToString(),
//                     StartLine = startLine,
//                     EndLine = endLine,
//                     Namespace = namespaceName ?? "",
//                     Documentation = documentation
//                 });
//             }
//
//             // 提取枚举定义
//             var enums = root.DescendantNodes().OfType<EnumDeclarationSyntax>();
//             foreach (var enumDecl in enums)
//             {
//                 // 获取行号信息
//                 var lineSpan = enumDecl.GetLocation().GetLineSpan();
//                 int startLine = lineSpan.StartLinePosition.Line + 1;
//                 int endLine = lineSpan.EndLinePosition.Line + 1;
//
//                 // 获取命名空间
//                 string? namespaceName = null;
//                 var parent = enumDecl.Parent;
//                 while (parent != null)
//                 {
//                     if (parent is NamespaceDeclarationSyntax ns)
//                     {
//                         namespaceName = ns.Name.ToString();
//                         break;
//                     }
//
//                     parent = parent.Parent;
//                 }
//
//                 // 获取XML文档注释
//                 string documentation = GetXmlDocumentation(enumDecl);
//
//                 segments.Add(new CodeSegment
//                 {
//                     Type = "Enum",
//                     Name = enumDecl.Identifier.ToString(),
//                     Code = enumDecl.ToString(),
//                     StartLine = startLine,
//                     EndLine = endLine,
//                     Namespace = namespaceName ?? "",
//                     Documentation = documentation
//                 });
//             }
//
//             // 如果没有找到任何结构，以固定行数分段
//             if (segments.Count == 0)
//             {
//                 segments = ParseCode.SplitByLines(code, 50);
//             }
//         }
//         catch (Exception ex)
//         {
//             segments = ParseCode.SplitByLines(code, 50); // 回退到简单分割
//         }
//
//         return segments;
//     }
//
//     /// <summary>
//     /// 从语法节点获取XML文档注释
//     /// </summary>
//     private static string GetXmlDocumentation(SyntaxNode node)
//     {
//         var trivia = node.GetLeadingTrivia()
//             .Select(t => t.GetStructure())
//             .OfType<DocumentationCommentTriviaSyntax>()
//             .FirstOrDefault();
//
//         if (trivia == null)
//             return string.Empty;
//
//         return trivia.ToString()
//             .Replace("/// ", "")
//             .Replace("///", "")
//             .Trim();
//     }
// }