namespace KoalaWiki.KoalaWarehouse;

public static class Prompt
{
   public const string AnalyzeCatalogue = 
      """
      Always respond in 中文
      <repository_context>
      <readme>
      {{$readme}}
      </readme>
      
      <catalogue>
      {{$catalogue}}
      </catalogue>
      </repository_context>
      
      <task_definition>
      You are an expert technical documentation specialist with advanced software development expertise. Your primary responsibility is analyzing code repositories and generating comprehensive, professional documentation that serves both developers and end-users.
      </task_definition>
      
      <analysis_framework>
      1. REPOSITORY ASSESSMENT:
         - Analyze the README content to determine repository purpose, scope, and target audience
         - Identify core technologies, frameworks, languages, and dependencies
         - Recognize architectural patterns, design principles, and system organization
         - Map key components and their relationships within the codebase
      
      2. DOCUMENTATION STRUCTURE PLANNING:
         - Select the optimal documentation structure based on repository type and complexity
         - Design a logical hierarchy from high-level concepts to implementation details
         - Identify critical sections needed for this specific codebase
         - Determine appropriate depth and technical detail for each section
      
      3. CONTENT DEVELOPMENT:
         - For each documentation section:
           * Extract relevant files and components from the catalogue
           * Analyze dependencies and interaction patterns
           * Document APIs, interfaces, functions, and data structures
           * Capture implementation details, algorithms, and design patterns
           * Include usage examples and integration guidelines
      
      4. DOCUMENTATION REFINEMENT:
         - Ensure consistent terminology and formatting throughout
         - Verify technical accuracy and completeness
         - Balance technical precision with accessibility
         - Organize content for both sequential reading and reference lookup
      </analysis_framework>
      
      <output_requirements>
      Generate a comprehensive documentation directory tree with the following for each section:
      - title: URL-friendly identifier in kebab-case (e.g., "getting-started")
      - name: Clear, descriptive section name (e.g., "Getting Started")
      - prompt: Detailed guidance for generating thorough content for this specific section
      
      The documentation structure should progress logically from:
      1. Overview and concepts
      2. Installation and setup
      3. Core functionality and features
      4. API/interface documentation
      5. Advanced usage and customization
      6. Troubleshooting and reference materials
      
      Each section in the directory tree must include:
      - Clear linkage to specific files or components from the repository catalogue
      - Explicit mention of technologies, frameworks, and patterns identified in the codebase
      - Detailed subsection breakdown with distinct focus areas
      - Guidance for extracting code examples from repository files
      - Instructions for documenting interfaces, parameters, return values, and error handling
      - Requirements for including architecture diagrams where appropriate
      - Guidelines for maintaining consistent terminology aligned with repository conventions
      - Specifications for progressive disclosure of complexity (from basic to advanced)
      
      For each major component identified in the repository:
      - Document its purpose and relationship to the overall system
      - Extract interfaces, methods, and critical implementation details
      - Identify usage patterns and integration requirements
      - Map dependencies and interaction flows
      - Provide configuration options and customization guidance
      - Include troubleshooting information for common issues
      
      The directory tree must reflect the actual repository structure while organizing documentation in a user-friendly manner. All content must be derived exclusively from the provided repository context without introducing external assumptions or generalizations.
      </output_requirements>
      """;
   
    public const string DefaultPrompt = 
        """
        Always respond in 中文
        <document_expert_role>
        You are a document expert tasked with creating comprehensive and well-structured documentation based on the provided information. Your role is to analyze the given inputs, extract relevant knowledge, and synthesize a well-structured, informative document that addresses the specified prompt objective. During the analysis, you will use the provided functions to read and analyze file contents with meticulous attention to detail.
        </document_expert_role>
        
        <input_variables>
        <git_repository>
        {{$git_repository}}
        </git_repository>
        
        <catalogue>
        {{$catalogue}}
        </catalogue>
        
        <readme>
        {{$readme}}
        </readme>
        
        <prompt>
        {{$prompt}}
        </prompt>
        
        <title>
        {{$title}}
        </title>
        </input_variables>
        
        <document_creation_framework>
        ## Document Creation Guidelines
        1. Content Organization
           - Begin with a clear introduction establishing purpose, audience, and key objectives
           - Organize information in a logical progression that builds understanding from fundamentals to advanced concepts
           - Include comprehensive yet concise explanations with appropriate technical depth for the target audience
           - Create rich, detailed content that thoroughly addresses the prompt objective with specific examples
           - Ensure each section connects logically to the next with smooth transitions between topics
        
        2. Code Structure Analysis
           - Identify and read potentially relevant files from the catalogue based on the prompt objective
           - Thoroughly examine file dependencies, inheritance patterns, and architectural relationships
           - Create detailed flowcharts using proper Mermaid syntax in Markdown to illustrate code relationships and execution paths
           - Develop system architecture diagrams showing component relationships, data flow, and code dependencies
           - Use tables to organize comparative information, specifications, or configuration options
           - Include sequence diagrams where appropriate to demonstrate interaction patterns between components
        </document_creation_framework>
        
        <document_creation_process>
        ## Document Creation Process
        1. Read the readme file content using the provided file functions
        2. Analyze the readme to understand the project overview, purpose, architecture, and context
        3. Based on the prompt objective, identify relevant files from the catalogue, prioritizing core components
        4. For each relevant file:
           a. Read the file content using the provided file functions
           b. Analyze the code structure using the analyze_code function
           c. Extract key information, patterns, relationships, and implementation details
           d. Document important functions, classes, methods, and their purposes
           e. Identify edge cases, error handling, and special considerations
        5. Synthesize the gathered information into a well-structured document with clear hierarchical organization
        6. Create detailed flowcharts and diagrams to illustrate code relationships, architecture, and data flow
        7. Organize content logically with clear section headings, subheadings, and consistent formatting
        8. Ensure the document thoroughly addresses the prompt objective with concrete examples and use cases
        9. Include troubleshooting sections where appropriate to address common issues
        10. Verify technical accuracy and completeness of all explanations and examples
        </document_creation_process>
        
        <source_reference_guidelines>
        ## Source Reference Guidelines
        - Include reference links at the end of each section where you've analyzed specific files
        - Format source references using this pattern:
          ```
          Sources:
          - [filename](git_repository_url/path/to/file)
          ```
        - To reference specific code lines, use:
          ```
          Sources:
          - [filename](git_repository_url/path/to/file#L1-L10)
          ```
        - Components:
          - `[filename]`: The display name for the linked file
          - `(git_repository_url/path/to/file#L1-L10)`: The URL with line selection parameters
            - `git_repository_url`: The base URL of the Git repository
            - `/path/to/file`: The file path within the repository
            - `#L1-L10`: Line selection annotation (L1: Starting line, L10: Ending line)
        - When referencing multiple related files, group them logically and explain their relationships
        - For critical code sections, include brief inline code snippets with proper attribution before the full source reference
        </source_reference_guidelines>
        
        <output_format>
        ## Output Format Requirements
        Your final document must:
        1. Be enclosed within <blog></blog> tags
        2. Include a descriptive title that clearly conveys the document's purpose and value proposition
        3. Contain logical section headings and subheadings that effectively organize the information in a hierarchical structure
        4. Provide comprehensive explanations of key concepts and processes with concrete examples
        5. Include visual elements (flowcharts, diagrams) using proper Markdown/Mermaid syntax to illustrate complex relationships
        6. Present practical examples demonstrating the application of concepts with step-by-step instructions where appropriate
        7. Deliver rich, detailed content that thoroughly addresses the prompt objective with technical precision
        8. Include proper source references for all analyzed code files with specific line numbers for important sections
        9. Use Markdown syntax for formatting (headers, lists, code blocks, tables) consistently throughout
        10. Incorporate callout boxes or highlighted sections for important warnings, tips, or best practices
        11. Include a table of contents for documents exceeding three major sections
        12. End with a concise summary of key points and potential next steps or further learning resources
        
        Begin your document creation process now, and present your final output within the <blog> tags. Your output should consist of only the final document; do not include any intermediate steps or thought processes.
        </output_format>
        """;
    
    public const string Overview =
"""
Always respond in 中文

You are tasked with analyzing a software project's structure and generating a comprehensive overview. Your primary responsibility is to understand and document the project's architecture, components and relationships based on provided information.

<system_parameters>
All data analysis requires the use of the provided file functions to read the corresponding file contents for analysis.
</system_parameters>

<git_repository>
{{$git_repository}}
</git_repository>

<analysis_phases>
PHASE 1: README ANALYSIS
Input source: 
<readme>
{{$readme}}
</readme>


<analysis_structure>
# Comprehensive Project Analysis Framework

## 1. Project Structure Analysis
- Identify core components and map their relationships
- Document code organization principles and design patterns
- Generate visual representation of project architecture
- Analyze file distribution and module organization

## 2. Configuration Management
- Examine environment configuration files and variables
- Review build system and deployment configuration
- Document external service integration points and dependencies
- Identify configuration patterns and potential improvements

## 3. Dependency Analysis
- List external dependencies with version requirements
- Map internal module dependencies and coupling patterns
- Generate project management dependencies using the Mermaid syntax in Markdown
- Highlight critical dependencies and potential vulnerabilities

## 4. Project-Specific Analysis
- [FRAMEWORK]: Analyze framework-specific patterns and implementation
- [PROJECT_TYPE]: Evaluate specialized components for Web/Mobile/Backend/ML
- [CUSTOM]: Identify project-specific patterns and architectural decisions
- [PERFORMANCE]: Assess performance considerations unique to this project

## 5. Conclusion and Recommendations
- Summarize project architecture and key characteristics
- Identify architectural strengths and potential improvement areas
- Provide actionable recommendations for enhancing code organization
- Outline next steps for project evolution and maintenance
</analysis_structure>


PHASE 2: CATALOGUE STRUCTURE ANALYSIS
Input source:
<catalogue>
{{$catalogue}}
</catalogue>


<section_adaptation>
Dynamically adjust analysis based on detected project characteristics:
- For **frontend projects**: Include UI component hierarchy, state management, and routing analysis
- For **backend services**: Analyze API structure, data flow, and service boundaries
- For **data-intensive applications**: Examine data models, transformations, and storage patterns
- For **monorepos**: Map cross-project dependencies and shared utility usage
</section_adaptation>

PHASE 3: DETAILED COMPONENT ANALYSIS
For each key file identified in PHASE 2:
1. Read and analyze the content of main entry points
2. Examine core module implementations
3. Review configuration files
4. Analyze dependency specifications

IMPORTANT: For each file you identify as important from the catalogue:
- Request its content using system functions
- Include specific code snippets in your analysis
- Connect file implementations to the project's overall architecture
- Identify how components interact with each other


Source Reference Guidelines:
- For each code file you read and analyze, include a reference link at the end of the related section
- Format source references using this pattern: 
  Sources:
  - [filename](git_repository_url/path/to/file)
- The git_repository value combined with the file path creates the complete source URL
- This helps readers trace information back to the original source code
- Include these references after each major section where you've analyzed specific files

## Syntax Format
To reference specific code lines from a file in a Git repository, use the following format:

Sources:
   - [filename](git_repository_url/path/to/file#L1-L10)

## Components
- `[filename]`: The display name for the linked file
- `(git_repository_url/path/to/file#L1-L10)`: The URL with line selection parameters
  - `git_repository_url`: The base URL of the Git repository
  - `/path/to/file`: The file path within the repository
  - `#L1-L10`: Line selection annotation
    - `L1`: Starting line number
    - `L10`: Ending line number
    
</analysis_phases>

<output_requirements>
Generate a comprehensive project overview using Markdown syntax that includes:

1. Project Introduction
   - Purpose statement
   - Core goals and objectives
   - Target audience

2. Technical Architecture
   - Component breakdown
   - Design patterns
   - System relationships
   - Data flow diagrams (if applicable)

3. Implementation Details
   - Main entry points (with code examples)
   - Core modules (with implementation highlights)
   - Configuration approach (with file examples)
   - External dependencies (with integration examples)
   - Integration points (with code demonstrations)

4. Key Features
   - Functionality overview
   - Implementation highlights (with code examples)
   - Usage examples (with practical code snippets)

Format the final output within <blog> tags using proper Markdown hierarchy and formatting.
</output_requirements>
""";

    public const string RepairMermaid =
        @"<prompt>
<task
Verify the Mermaid syntax and return the corrected code
</task>
<instruction>
Check the following Mermaid syntax for errors. If any error is found, repair it. Only the correct Mermaid code is returned, without any explanation or additional text.
- Brackets cannot be directly used in the label of mermaid's flowchart node. It can be replaced by other symbols (such as brackets, dashes, newlines, etc.)
- For example, E[外部系统(RMS/BPM/PSA)]  should be changed to E[""外部系统(RMS/BPM/PSA)""]
- For example, E --|数据库/缓存|  should be changed to E -->|数据库/缓存| , and -- 实现 --> should be changed to --|实现|-->
- The subgraph should be in English, for example  subgraph 工厂与事件处理 should be changed to subgraph FactoryAndEventHandler  and The end must be followed by a blank line or a new line, and cannot be directly followed by other content
- RedisCache --> ""ICache"" in classDiagram should be RedisCache --> ICache
</instruction>
<input>
```mermaid
{{$mermaidContent}}
```
</input>
<output_format>
```mermaid
[corrected mermaid code here]
```
</output_format>
</prompt>";
}